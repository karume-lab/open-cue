import {
  type AndroidManifest,
  type ConfigPlugin,
  type ExportedConfigWithProps,
  withAndroidManifest,
} from "@expo/config-plugins";

const MANAGE_EXTERNAL_STORAGE = "android.permission.MANAGE_EXTERNAL_STORAGE";

// Declares MANAGE_EXTERNAL_STORAGE ("All files access") so the app can create
// the Cue folder directly at the root of shared storage (/storage/emulated/0/
// Cue) on Android 11+. Without it the system settings screen for granting the
// access is unavailable to the app.
const withAllFilesAccess: ConfigPlugin = (config) => {
  config = withAndroidManifest(
    config,
    (config: ExportedConfigWithProps<AndroidManifest>) => {
      const usesPermissions =
        config.modResults.manifest["uses-permission"] ?? [];
      if (
        !usesPermissions.some(
          (permission) =>
            permission.$["android:name"] === MANAGE_EXTERNAL_STORAGE,
        )
      ) {
        usesPermissions.push({
          $: { "android:name": MANAGE_EXTERNAL_STORAGE },
        });
        config.modResults.manifest["uses-permission"] = usesPermissions;
      }
      return config;
    },
  );
  return config;
};

export default withAllFilesAccess;
