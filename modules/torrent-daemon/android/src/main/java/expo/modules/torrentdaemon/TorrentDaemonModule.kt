package expo.modules.torrentdaemon

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

// This imports the gomobile bound package. Note: gomobile uses the package name
import daemon.Daemon

private const val REQUEST_CODE_ALL_FILES_ACCESS = 7301
private const val ALL_FILES_POLL_INTERVAL_MS = 500L
private const val ALL_FILES_POLL_TIMEOUT_MS = 5 * 60 * 1000L

class TorrentDaemonModule : Module() {
  private lateinit var storageDirectoryLauncher: AppContextActivityResultLauncher<String, Uri?>

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var pendingAllFilesPromise: Promise? = null
  private var allFilesPollJob: Job? = null

  override fun definition() = ModuleDefinition {
    Name("TorrentDaemon")

    RegisterActivityContracts {
      storageDirectoryLauncher = registerForActivityResult(StorageDirectoryContract())
    }

    // Picks a folder on shared/external storage via Android's SAF picker and
    // returns its real filesystem path (for the Go daemon) plus the content
    // tree URI (for SAF-backed file operations in JS), or null if the user
    // cancels or the folder can't be mapped to a path. The SAF grant is
    // persisted so the app keeps write access across restarts and updates.
    AsyncFunction("pickStorageDirectory") Coroutine { ->
      val uri = storageDirectoryLauncher.launch("") ?: return@Coroutine null
      val context = appContext.reactContext ?: return@Coroutine null
      context.contentResolver.takePersistableUriPermission(
        uri,
        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
      )
      mapOf(
        "path" to resolveTreeUriToPath(uri),
        "uri" to uri.toString(),
      )
    }

    // True when the app holds "All files access" (MANAGE_EXTERNAL_STORAGE). On
    // Android 11+ (API 30) that is required to create folders directly on
    // shared storage (e.g. /storage/emulated/0/Cue) with raw file paths.
    Function("hasAllFilesAccess") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
        Environment.isExternalStorageManager()
    }

    // Opens the system "All files access" screen for this app and resolves once
    // the user grants access (or backs out without granting). Flipping the
    // toggle there emits no callback, so we poll for the grant while the user is
    // on that screen, mirroring the WRITE_SETTINGS flow.
    AsyncFunction("requestAllFilesAccess") { promise: Promise ->
      val context = appContext.reactContext
      val activity = appContext.currentActivity
      if (context == null || activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
        Environment.isExternalStorageManager()
      ) {
        promise.resolve(true)
        return@AsyncFunction
      }
      pendingAllFilesPromise = promise
      try {
        val intent = Intent(
          Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
          Uri.parse("package:${context.packageName}"),
        )
        activity.startActivityForResult(intent, REQUEST_CODE_ALL_FILES_ACCESS)
        startAllFilesGrantPoller(context)
      } catch (_: Exception) {
        pendingAllFilesPromise = null
        promise.resolve(false)
      }
    }

    // Creates a "Cue" folder at the root of external shared storage
    // (/storage/emulated/0/Cue, shown as Internal Storage > Cue) and returns
    // its absolute path, or null on failure. The folder lives outside
    // app-private storage so it survives an uninstall. On Android 11+ this
    // needs "All files access" — request it first when hasAllFilesAccess() is
    // false.
    AsyncFunction("createDefaultCueDirectory") Coroutine { ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
        return@Coroutine null
      }
      val root = Environment.getExternalStorageDirectory()
      val cueDir = java.io.File(root, "Cue")
      if (!cueDir.exists()) {
        try {
          if (!cueDir.mkdirs()) return@Coroutine null
        } catch (_: SecurityException) {
          return@Coroutine null
        }
      }
      cueDir.absolutePath
    }

    AsyncFunction("startDaemon") { storagePath: String ->
      Daemon.start(storagePath)
    }

    AsyncFunction("stopDaemon") {
      Daemon.stop()
    }

    AsyncFunction("addMagnet") { uri: String ->
      Daemon.addMagnet(uri)
    }

    Function("getProgress") { infoHash: String ->
      Daemon.getProgress(infoHash)
    }

    Function("getDownloadSpeed") { infoHash: String ->
      Daemon.getDownloadSpeed(infoHash)
    }

    Function("getUploadSpeed") { infoHash: String ->
      Daemon.getUploadSpeed(infoHash)
    }

    Function("getTorrentStats") { infoHash: String ->
      Daemon.getTorrentStats(infoHash)
    }

    Function("getGlobalStats") {
      Daemon.getGlobalStats()
    }

    Function("getFiles") { infoHash: String ->
      Daemon.getFiles(infoHash)
    }

    AsyncFunction("pause") { infoHash: String ->
      Daemon.pause(infoHash)
    }

    AsyncFunction("resume") { infoHash: String ->
      Daemon.resume(infoHash)
    }

    AsyncFunction("deleteTorrent") { infoHash: String ->
      Daemon.deleteTorrent(infoHash)
    }

    AsyncFunction("streamTorrent") { uri: String ->
      Daemon.streamTorrent(uri)
    }

    AsyncFunction("stopStreaming") { infoHash: String ->
      Daemon.stopStreaming(infoHash)
    }

    AsyncFunction("startDownloadNotifications") { downloads: List<Map<String, Any?>> ->
      startService(downloadsJson(downloads))
    }

    AsyncFunction("updateDownloadNotifications") { downloads: List<Map<String, Any?>> ->
      startService(downloadsJson(downloads))
    }

    AsyncFunction("stopDownloadNotifications") {
      stopService()
    }

    AsyncFunction("startLanServing") { _: String -> }

    AsyncFunction("stopLanServing") {}

    Function("getLanStreamURL") { _: String ->
      ""
    }

    Function("getLanFileURL") { _: String ->
      ""
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == REQUEST_CODE_ALL_FILES_ACCESS) {
        stopAllFilesGrantPoller()
        val context = appContext.reactContext
        val granted =
          context != null &&
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
            Environment.isExternalStorageManager()
        pendingAllFilesPromise?.resolve(granted)
        pendingAllFilesPromise = null
      }
    }
  }

  private fun startAllFilesGrantPoller(context: android.content.Context) {
    stopAllFilesGrantPoller()
    allFilesPollJob = scope.launch {
      val deadline = System.currentTimeMillis() + ALL_FILES_POLL_TIMEOUT_MS
      while (isActive) {
        if (
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
          Environment.isExternalStorageManager()
        ) {
          bringAppToForeground(context)
          pendingAllFilesPromise?.resolve(true)
          pendingAllFilesPromise = null
          return@launch
        }
        if (System.currentTimeMillis() >= deadline) return@launch
        delay(ALL_FILES_POLL_INTERVAL_MS)
      }
    }
  }

  private fun stopAllFilesGrantPoller() {
    allFilesPollJob?.cancel()
    allFilesPollJob = null
  }

  private fun bringAppToForeground(context: android.content.Context) {
    val launchIntent = context.packageManager
      .getLaunchIntentForPackage(context.packageName)
      ?: return
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
    context.startActivity(launchIntent)
  }

  private fun downloadsJson(downloads: List<Map<String, Any?>>): String {
    val arr = JSONArray()
    for (download in downloads) {
      arr.put(
        JSONObject().apply {
          put("id", download["id"] as? String ?: "")
          put("hash", download["hash"] as? String ?: "")
          put("title", download["title"] as? String ?: "")
          put("label", download["label"] as? String ?: "")
          put("state", download["state"] as? String ?: "downloading")
        },
      )
    }
    return arr.toString()
  }

  private fun startService(json: String) {
    val context = appContext.reactContext ?: return
    val intent = Intent(context, TorrentDownloadService::class.java)
      .putExtra(TorrentDownloadService.Companion.EXTRA_DOWNLOADS, json)
    ContextCompat.startForegroundService(context, intent)
  }

  private fun stopService() {
    val context = appContext.reactContext ?: return
    context.stopService(Intent(context, TorrentDownloadService::class.java))
  }

  // Maps a SAF tree URI (e.g. content://com.android.externalstorage.documents/
  // tree/primary:Download) back to a real filesystem path
  // (e.g. /storage/emulated/0/Download) the Go daemon can open()/mmap.
  // Returns null for providers that don't map to a real path.
  private fun resolveTreeUriToPath(uri: Uri): String? {
    if (uri.scheme != "content") return null
    val documentId = DocumentsContract.getTreeDocumentId(uri) ?: return null
    val separator = documentId.indexOf(':')
    if (separator <= 0) return null
    val volume = documentId.substring(0, separator)
    val relative = documentId.substring(separator + 1)
    val root = if (volume == "primary") {
      Environment.getExternalStorageDirectory().absolutePath
    } else {
      "/storage/$volume"
    }
    return if (relative.isEmpty()) root else "$root/$relative"
  }
}
