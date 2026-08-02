package expo.modules.torrentdaemon

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

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

    AsyncFunction("pause") { infoHash: String ->
      Daemon.pause(infoHash)
    }

    AsyncFunction("resume") { infoHash: String ->
      Daemon.resume(infoHash)
    }
  }
}
