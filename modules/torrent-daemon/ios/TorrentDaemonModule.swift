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
  }
}
