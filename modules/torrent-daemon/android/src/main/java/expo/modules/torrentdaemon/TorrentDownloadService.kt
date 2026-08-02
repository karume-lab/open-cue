package expo.modules.torrentdaemon

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import org.json.JSONArray
import org.json.JSONObject
import daemon.Daemon
import java.util.LinkedHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Keeps the app process alive while downloads are in progress and shows one
 * notification per active download in the status bar, updating each progress
 * bar every second straight from the Go daemon.
 *
 * The service survives the user swiping the app away from recents. Force-stop
 * or device reboot still kills it (and the in-process daemon with it).
 *
 * Note: Android 15 applies a 6-hour daily limit to the `dataSync`
 * foreground-service type; long torrents may outlive it.
 */
class TorrentDownloadService : Service() {

  companion object {
    const val CHANNEL_ID = "downloads"
    const val CHANNEL_NAME = "Download progress"
    const val EXTRA_DOWNLOADS = "downloads"
    private const val PREFS_NAME = "cue_download_service"
    private const val PREFS_ENTRIES = "entries"
    private const val POLL_INTERVAL_MS = 1000L
    // Completion notifications use a separate id range so they survive the
    // foreground notification being removed when the service stops.
    private const val COMPLETE_OFFSET = 1_000_000
  }

  data class DownloadEntry(
    val id: String,
    val hash: String,
    val title: String,
    val label: String,
    val state: String,
  )

  private val entries = LinkedHashMap<String, DownloadEntry>()
  private val lastProgress = HashMap<String, Double>()
  private var scheduler: ScheduledExecutorService? = null
  private var foregroundEntryId: String? = null
  private lateinit var prefs: SharedPreferences

  override fun onCreate() {
    super.onCreate()
    prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    createChannel()
    synchronized(entries) {
      loadEntries().forEach { entries[it.id] = it }
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    intent?.getStringExtra(EXTRA_DOWNLOADS)?.let { json ->
      synchronized(entries) {
        entries.clear()
        parseEntries(json).forEach { entries[it.id] = it }
        persistEntriesLocked()
      }
    }

    synchronized(entries) {
      if (entries.isEmpty()) {
        stopSelf()
        return START_NOT_STICKY
      }
    }

    startPolling()
    ensureForeground()
    tick()
    return START_STICKY
  }

  override fun onDestroy() {
    scheduler?.shutdownNow()
    scheduler = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startPolling() {
    val running = scheduler?.let { !it.isShutdown } ?: false
    if (running) return
    scheduler = Executors.newSingleThreadScheduledExecutor().apply {
      scheduleWithFixedDelay({ runCatching { tick() } }, 0, POLL_INTERVAL_MS, TimeUnit.MILLISECONDS)
    }
  }

  private fun ensureForeground() {
    synchronized(entries) {
      val first = entries.values.firstOrNull() ?: return
      foregroundEntryId = first.id
      val progress = lastProgress[first.id] ?: Daemon.getProgress(first.hash)
      ServiceCompat.startForeground(
        this,
        notifId(first),
        buildProgressNotification(first, progress),
        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
      )
    }
  }

  private fun tick() {
    val completed = mutableListOf<DownloadEntry>()

    synchronized(entries) {
      for (entry in entries.values) {
        val progress = if (entry.state == "paused") {
          lastProgress[entry.id] ?: 0.0
        } else {
          Daemon.getProgress(entry.hash)
        }

        if (entry.state != "paused" && progress >= 1.0) {
          postCompleted(entry)
          lastProgress.remove(entry.id)
          completed.add(entry)
          continue
        }

        lastProgress[entry.id] = progress
        postProgress(entry, progress)
      }

      completed.forEach { entries.remove(it.id) }
      persistEntriesLocked()

      val first = entries.values.firstOrNull()
      if (first == null) {
        foregroundEntryId = null
      } else if (first.id != foregroundEntryId) {
        // Re-target the foreground notification to the new first download.
        foregroundEntryId = first.id
        ServiceCompat.startForeground(
          this,
          notifId(first),
          buildProgressNotification(first, lastProgress[first.id] ?: Daemon.getProgress(first.hash)),
          ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
        )
      }
    }

    if (entries.isEmpty()) {
      stopSelf()
    }
  }

  private fun postProgress(entry: DownloadEntry, progress: Double) {
    val notification = buildProgressNotification(entry, progress)
    if (entry.id == foregroundEntryId) {
      ServiceCompat.startForeground(
        this,
        notifId(entry),
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
      )
    } else {
      NotificationManagerCompat.from(this).notify(notifId(entry), notification)
    }
  }

  private fun buildProgressNotification(entry: DownloadEntry, progress: Double): Notification {
    val percent = (progress.coerceIn(0.0, 1.0) * 100).toInt()
    val status = when (entry.state) {
      "queued" -> "Queued"
      "paused" -> "Paused · $percent%"
      else -> "$percent%"
    }
    val text =
      if (entry.label.isNotBlank() && entry.label != "Movie") {
        "${entry.label} · $status"
      } else {
        status
      }

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_download)
      .setContentTitle("Downloading ${entry.title}")
      .setContentText(text)
      .setOngoing(entry.state != "paused")
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setProgress(
        if (entry.state == "queued") 0 else 100,
        percent,
        entry.state == "queued",
      )
      .setContentIntent(contentIntent())
      .build()
  }

  private fun postCompleted(entry: DownloadEntry) {
    val label = entry.label.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_download)
      .setContentTitle("Download complete")
      .setContentText("${entry.title}$label")
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(contentIntent())
      .build()
    NotificationManagerCompat.from(this).notify(notifId(entry) + COMPLETE_OFFSET, notification)
  }

  private fun contentIntent(): PendingIntent {
    val launch = packageManager.getLaunchIntentForPackage(packageName)
      ?: Intent(Intent.ACTION_MAIN)
    return PendingIntent.getActivity(
      this,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun notifId(entry: DownloadEntry): Int =
    entry.id.hashCode() and 0x7fffffff

  private fun createChannel() {
    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      setShowBadge(false)
    }
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  private fun persistEntriesLocked() {
    val arr = JSONArray()
    for (entry in entries.values) {
      arr.put(
        JSONObject().apply {
          put("id", entry.id)
          put("hash", entry.hash)
          put("title", entry.title)
          put("label", entry.label)
          put("state", entry.state)
        },
      )
    }
    prefs.edit().putString(PREFS_ENTRIES, arr.toString()).apply()
  }

  private fun loadEntries(): List<DownloadEntry> {
    val json = prefs.getString(PREFS_ENTRIES, null) ?: return emptyList()
    return parseEntries(json)
  }

  private fun parseEntries(json: String): List<DownloadEntry> {
    return try {
      val arr = JSONArray(json)
      (0 until arr.length()).mapNotNull { index ->
        val obj = arr.getJSONObject(index)
        DownloadEntry(
          id = obj.optString("id", ""),
          hash = obj.optString("hash", ""),
          title = obj.optString("title", ""),
          label = obj.optString("label", ""),
          state = obj.optString("state", "downloading"),
        )
      }.filter { it.id.isNotBlank() && it.hash.isNotBlank() }
    } catch (_: Exception) {
      emptyList()
    }
  }
}
