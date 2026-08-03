import { requireNativeModule } from "expo-modules-core";

interface SettingsPermissionInterface {
  isWriteSettingsGranted(): boolean;
  requestWriteSettings(): Promise<boolean>;
}

export default requireNativeModule<SettingsPermissionInterface>(
  "SettingsPermission",
);
