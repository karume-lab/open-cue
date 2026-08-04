package expo.modules.torrentdaemon

import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import androidx.core.content.ContextCompat
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

// This imports the gomobile bound package. Note: gomobile uses the package name
import daemon.Daemon

class TorrentDaemonModule : Module() {
  private lateinit var storageDirectoryLauncher: AppContextActivityResultLauncher<String, Uri?>

  override fun definition() = ModuleDefinition {
    Name("TorrentDaemon")

    RegisterActivityContracts {
      storageDirectoryLauncher = registerForActivityResult(StorageDirectoryContract())
    }

    // Picks a folder on shared/external storage via Android's SAF picker and
    // returns its real filesystem path, or null if the user cancels or the
    // folder can't be mapped to a path. The SAF grant is persisted so the Go
    // daemon can keep writing to the folder across app restarts and updates.
    AsyncFunction("pickStorageDirectory") Coroutine { ->
      val uri = storageDirectoryLauncher.launch("") ?: return@Coroutine null
      val context = appContext.reactContext ?: return@Coroutine null
      context.contentResolver.takePersistableUriPermission(
        uri,
        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
      )
      resolveTreeUriToPath(uri)
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

    AsyncFunction("startLanServing") { fileDir: String ->
      Daemon.startLANServing(fileDir)
    }

    AsyncFunction("stopLanServing") {
      Daemon.stopLANServing()
    }

    Function("getLanStreamURL") { infoHash: String ->
      Daemon.getLanStreamURL(infoHash)
    }

    Function("getLanFileURL") { filePath: String ->
      Daemon.getLanFileURL(filePath)
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
