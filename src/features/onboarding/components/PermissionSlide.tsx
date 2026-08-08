import { Check } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export type PermissionSlideType = "notifications" | "writeSettings";

const PERMISSION_CONTENT: Record<
  PermissionSlideType,
  { why: string; without: string; grantedLabel: string }
> = {
  notifications: {
    why: "Notifications alert you when a bookmarked movie gets a new 4K release, even while the app is closed.",
    without: "Without them, you won't be notified about new 4K releases.",
    grantedLabel: "Notifications enabled",
  },
  writeSettings: {
    why: "The player needs this to adjust brightness when you swipe the left edge of the screen during playback.",
    without: "Without it, brightness gestures won't work while streaming.",
    grantedLabel: "Permission granted",
  },
};

interface PermissionSlideProps {
  type: PermissionSlideType;
  granted: boolean;
}

// Explains a permission and reflects whether it has been granted. Approval is
// handled by the onboarding's Next button, not a button on this slide.
export const PermissionSlide: React.FC<PermissionSlideProps> = ({
  type,
  granted,
}) => {
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
      {granted ? (
        <View className="self-center flex-row items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-2">
          <Icon as={Check} size={16} className="text-primary" />
          <Text className="text-sm font-semibold text-primary">
            {content.grantedLabel}
          </Text>
        </View>
      ) : (
        <Text className="text-xs text-muted-foreground text-center leading-5">
          Tap the button below to grant this permission.
        </Text>
      )}
    </View>
  );
};
