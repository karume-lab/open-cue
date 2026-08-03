package expo.modules.settingspermission

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val REQUEST_CODE_WRITE_SETTINGS = 7291

class SettingsPermissionModule : Module() {
  private var pendingPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("SettingsPermission")

    Function("isWriteSettingsGranted") {
      val context = appContext.reactContext ?: return@Function false
      Settings.System.canWrite(context)
    }

    // Opens the system "modify system settings" screen for this app and
    // resolves when the user returns (via startActivityForResult), so the
    // app is brought back to the foreground automatically.
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
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == REQUEST_CODE_WRITE_SETTINGS) {
        val context = appContext.reactContext
        val granted = context != null && Settings.System.canWrite(context)
        pendingPromise?.resolve(granted)
        pendingPromise = null
      }
    }
  }
}
