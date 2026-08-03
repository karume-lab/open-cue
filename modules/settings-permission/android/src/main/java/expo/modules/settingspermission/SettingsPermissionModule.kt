package expo.modules.settingspermission

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

private const val REQUEST_CODE_WRITE_SETTINGS = 7291
private const val POLL_INTERVAL_MS = 500L
private const val POLL_TIMEOUT_MS = 5 * 60 * 1000L

class SettingsPermissionModule : Module() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var pendingPromise: Promise? = null
  private var pollJob: Job? = null

  override fun definition() = ModuleDefinition {
    Name("SettingsPermission")

    Function("isWriteSettingsGranted") {
      val context = appContext.reactContext ?: return@Function false
      Settings.System.canWrite(context)
    }

    // Opens the system "modify system settings" screen for this app. Flipping
    // the toggle there emits no callback, so while the user is on that screen
    // we poll for the grant and pull the app back to the foreground the moment
    // it happens. The OnActivityResult path remains as a fallback for when the
    // user backs out without toggling.
    AsyncFunction("requestWriteSettings") { promise: Promise ->
      val context = appContext.reactContext
      val activity = appContext.currentActivity
      if (context == null || activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      if (Settings.System.canWrite(context)) {
        promise.resolve(true)
        return@AsyncFunction
      }
      pendingPromise = promise
      val intent = Intent(
        Settings.ACTION_MANAGE_WRITE_SETTINGS,
        Uri.parse("package:${context.packageName}"),
      )
      activity.startActivityForResult(intent, REQUEST_CODE_WRITE_SETTINGS)
      startGrantPoller(context)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == REQUEST_CODE_WRITE_SETTINGS) {
        stopGrantPoller()
        val context = appContext.reactContext
        val granted = context != null && Settings.System.canWrite(context)
        pendingPromise?.resolve(granted)
        pendingPromise = null
      }
    }
  }

  private fun startGrantPoller(context: Context) {
    stopGrantPoller()
    pollJob = scope.launch {
      val deadline = System.currentTimeMillis() + POLL_TIMEOUT_MS
      while (isActive) {
        if (Settings.System.canWrite(context)) {
          bringAppToForeground(context)
          pendingPromise?.resolve(true)
          pendingPromise = null
          return@launch
        }
        if (System.currentTimeMillis() >= deadline) return@launch
        delay(POLL_INTERVAL_MS)
      }
    }
  }

  private fun stopGrantPoller() {
    pollJob?.cancel()
    pollJob = null
  }

  private fun bringAppToForeground(context: Context) {
    val launchIntent = context.packageManager
      .getLaunchIntentForPackage(context.packageName)
      ?: return
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
    context.startActivity(launchIntent)
  }
}
