package expo.modules.torrentdaemon

import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

// This imports the gomobile bound package. Note: gomobile uses the package name
import daemon.Daemon

class TorrentDaemonModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TorrentDaemon")

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

    Function("getFiles") { infoHash: String ->
      Daemon.getFiles(infoHash)
    }

    AsyncFunction("pause") { infoHash: String ->
      Daemon.pause(infoHash)
    }

    AsyncFunction("resume") { infoHash: String ->
      Daemon.resume(infoHash)
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
}
