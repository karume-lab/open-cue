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
    AsyncFunction("pickStorageDirectory") { () -> String? in
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

    Function("getProgress") { (infoHash: String) -> Double in
      return DaemonGetProgress(infoHash)
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

    AsyncFunction("streamTorrent") { (uri: String) -> String in
      var error: NSError?
      let streamUrl = DaemonStreamTorrent(uri, &error)
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
  }
}
