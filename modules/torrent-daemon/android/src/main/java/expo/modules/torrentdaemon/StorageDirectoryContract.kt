package expo.modules.torrentdaemon

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.activityresult.AppContextActivityResultContract

/**
 * Launches Android's folder picker (`ACTION_OPEN_DOCUMENT_TREE`) and returns
 * the selected directory as a `content://` tree URI, or `null` if the user
 * cancels. The granted permission is persisted by the caller so the app keeps
 * raw read/write access to the folder across restarts and updates.
 */
internal class StorageDirectoryContract :
  AppContextActivityResultContract<String, Uri?> {
  override fun createIntent(context: Context, input: String): Intent =
    Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
      addFlags(
        Intent.FLAG_GRANT_READ_URI_PERMISSION or
          Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
          Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
      )
    }

  override fun parseResult(input: String, resultCode: Int, intent: Intent?): Uri? =
    if (resultCode == Activity.RESULT_OK) intent?.data else null
}
