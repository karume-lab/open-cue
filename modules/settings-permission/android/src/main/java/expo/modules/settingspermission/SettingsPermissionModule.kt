package expo.modules.settingspermission

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SettingsPermissionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SettingsPermission")

    Function("isWriteSettingsGranted") {
      val context = appContext.reactContext ?: return@Function false
      Settings.System.canWrite(context)
    }

    // Opens the system "draw over / modify system settings" screen for this
    // app. Resolves false if the prompt was launched (grant is granted later
    // on the system screen and detected via isWriteSettingsGranted).
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
      val intent = Intent(
        Settings.ACTION_MANAGE_WRITE_SETTINGS,
        Uri.parse("package:${context.packageName}"),
      )
      activity.startActivity(intent)
      promise.resolve(false)
    }
  }
}
