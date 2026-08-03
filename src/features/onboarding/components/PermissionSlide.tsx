import * as Notifications from "expo-notifications";
import { Check } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { requestNotificationPermissions } from "@/services/NotificationService";

export type PermissionSlideType = "notifications" | "writeSettings";

const PERMISSION_CONTENT: Record<
  PermissionSlideType,
  {
    why: string;
    without: string;
    actionLabel: string;
    grantedLabel: string;
  }
> = {
  notifications: {
    why: "Notifications alert you when a bookmarked movie gets a new 4K release, even while the app is closed.",
    without: "Without them, you won't be notified about new 4K releases.",
    actionLabel: "Allow notifications",
    grantedLabel: "Notifications enabled",
  },
  writeSettings: {
    why: "The player needs this to adjust brightness when you swipe the left edge of the screen during playback.",
    without: "Without it, brightness gestures won't work while streaming.",
    actionLabel: "Open system settings",
    grantedLabel: "Permission granted",
  },
};

interface PermissionSlideProps {
  type: PermissionSlideType;
}

export const PermissionSlide: React.FC<PermissionSlideProps> = ({ type }) => {
  const [granted, setGranted] = useState(false);

  const checkStatus = useCallback(async () => {
    let isGranted = false;
    if (type === "notifications") {
      const { status } = await Notifications.getPermissionsAsync();
      isGranted = status === "granted";
    } else if (Platform.OS === "android") {
      const SettingsPermission =
        require("~/modules/settings-permission").default;
      isGranted = SettingsPermission.isWriteSettingsGranted();
    }
    setGranted(isGranted);
  }, [type]);

  useEffect(() => {
    checkStatus();
    // Re-check when the user returns from the system settings screen, where
    // the WRITE_SETTINGS permission must be granted manually.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkStatus();
    });
    return () => subscription.remove();
  }, [checkStatus]);

  const handleRequest = useCallback(async () => {
    if (type === "notifications") {
      await requestNotificationPermissions();
    } else if (Platform.OS === "android") {
      const SettingsPermission =
        require("~/modules/settings-permission").default;
      await SettingsPermission.requestWriteSettings().catch(() => {});
    }
    await checkStatus();
  }, [type, checkStatus]);

  const content = PERMISSION_CONTENT[type];

  return (
    <View className="w-full">
      <View className="bg-card border border-border rounded-md p-4 mb-4">
        <Text className="text-sm leading-5">
          <Text className="text-primary font-semibold">Why we need it: </Text>
          <Text className="text-muted-foreground">{content.why}</Text>
        </Text>
        <Text className="text-sm leading-5 mt-3">
          <Text className="text-primary font-semibold">Without it: </Text>
          <Text className="text-muted-foreground">{content.without}</Text>
        </Text>
      </View>
      <Button
        variant={granted ? "secondary" : "outline"}
        onPress={handleRequest}
        disabled={granted}
        className="w-full h-14 rounded-md"
      >
        {granted && (
          <Icon
            as={Check}
            size={16}
            className={cn(
              granted ? "text-secondary-foreground" : "text-primary-foreground",
            )}
          />
        )}
        <Text
          className="font-semibold text-lg"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {granted ? content.grantedLabel : content.actionLabel}
        </Text>
      </Button>
    </View>
  );
};
