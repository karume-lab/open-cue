import ExpoModulesCore
import Daemon

public class TorrentDaemonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TorrentDaemon")

    AsyncFunction("startDaemon") { (storagePath: String) in
      var error: NSError?
      DaemonStart(storagePath, &error)
      if let err = error {
        throw err
      }
    }

    AsyncFunction("stopDaemon") {
      DaemonStop()
    }

    // Shared-storage folder picking is Android-only (SAF). No-op on iOS.
    AsyncFunction("pickStorageDirectory") { () -> [String: Any?]? in
      return nil
    }

    AsyncFunction("addMagnet") { (uri: String) -> String in
      var error: NSError?
      let infoHash = DaemonAddMagnet(uri, &error)
      if let err = error {
        throw err
      }
      return infoHash
    }

    AsyncFunction("addMagnetFile") { (uri: String, index: Int64) -> String in
      var error: NSError?
      let infoHash = DaemonAddMagnetFile(uri, index, &error)
      if let err = error {
        throw err
      }
      return infoHash
    }

    // indices is a comma-separated list of file indices ("2,5,7"); gomobile
    // cannot pass int arrays. Indices are unioned into the torrent's enabled
    // set.
    AsyncFunction("addMagnetFiles") { (uri: String, indices: String) -> String in
      var error: NSError?
      let infoHash = DaemonAddMagnetFiles(uri, indices, &error)
      if let err = error {
        throw err
      }
      return infoHash
    }

    AsyncFunction("probeTorrent") { (uri: String) -> String in
      var error: NSError?
      let filesJson = DaemonProbeTorrent(uri, &error)
      if let err = error {
        throw err
      }
      return filesJson
    }

    AsyncFunction("setFileEnabled") { (infoHash: String, index: Int64, enabled: Bool) -> Int64 in
      var error: NSError?
      let remaining = DaemonSetFileEnabled(infoHash, index, enabled, &error)
      if let err = error {
        throw err
      }
      return remaining
    }

    Function("getFileProgress") { (infoHash: String, index: Int64) -> Double in
      return DaemonGetFileProgress(infoHash, index)
    }

    Function("getFileTorrentStats") { (infoHash: String, index: Int64) -> String in
      return DaemonGetFileTorrentStats(infoHash, index)
    }

    Function("getProgress") { (infoHash: String) -> Double in
      return DaemonGetProgress(infoHash)
    }

    Function("getDownloadSpeed") { (infoHash: String) -> Double in
      return DaemonGetDownloadSpeed(infoHash)
    }

    Function("getUploadSpeed") { (infoHash: String) -> Double in
      return DaemonGetUploadSpeed(infoHash)
    }

    Function("getTorrentStats") { (infoHash: String) -> String in
      return DaemonGetTorrentStats(infoHash)
    }

    Function("getGlobalStats") { () -> String in
      return DaemonGetGlobalStats()
    }

    Function("getFiles") { (infoHash: String) -> String in
      return DaemonGetFiles(infoHash)
    }

    AsyncFunction("pause") { (infoHash: String) in
      var error: NSError?
      DaemonPause(infoHash, &error)
      if let err = error {
        throw err
      }
    }

    AsyncFunction("resume") { (infoHash: String) in
      var error: NSError?
      DaemonResume(infoHash, &error)
      if let err = error {
        throw err
      }
    }

    AsyncFunction("deleteTorrent") { (infoHash: String) in
      var error: NSError?
      DaemonDeleteTorrent(infoHash, &error)
      if let err = error {
        throw err
      }
    }

    AsyncFunction("streamTorrent") { (uri: String) -> String in
      var error: NSError?
      let streamUrl = DaemonStreamTorrent(uri, &error)
      if let err = error {
        throw err
      }
      return streamUrl
    }

    AsyncFunction("streamTorrentFile") { (uri: String, index: Int64) -> String in
      var error: NSError?
      let streamUrl = DaemonStreamTorrentFile(uri, index, &error)
      if let err = error {
        throw err
      }
      return streamUrl
    }

    AsyncFunction("stopStreaming") { (infoHash: String) in
      var error: NSError?
      DaemonStopStreaming(infoHash, &error)
      if let err = error {
        throw err
      }
    }

    // Foreground-service download notifications are Android-only. These no-op
    // so the JS interface exists cross-platform.
    AsyncFunction("startDownloadNotifications") { (_: [[String: Any]]) in
    }

    AsyncFunction("updateDownloadNotifications") { (_: [[String: Any]]) in
    }

    AsyncFunction("stopDownloadNotifications") {
    }

    AsyncFunction("startLanServing") { (fileDir: String) in
      var error: NSError?
      DaemonStartLANServing(fileDir, &error)
      if let err = error {
        throw err
      }
    }

    AsyncFunction("stopLanServing") {
      DaemonStopLANServing()
    }

    Function("getLanStreamURL") { (infoHash: String) -> String in
      return DaemonGetLanStreamURL(infoHash)
    }

    Function("getLanFileURL") { (filePath: String) -> String in
      return DaemonGetLanFileURL(filePath)
    }
  }
}
