import { Inbox } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface TorrentEmptyStateProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export const TorrentEmptyState = ({
  message,
  actionLabel,
  onAction,
}: TorrentEmptyStateProps) => (
  <View className="items-center justify-center py-12 px-6 gap-4">
    <View className="size-16 rounded-full bg-muted/40 items-center justify-center">
      <Icon as={Inbox} size={28} className="text-muted-foreground" />
    </View>
    <Text className="text-muted-foreground text-sm text-center">{message}</Text>
    <TouchableOpacity
      onPress={onAction}
      activeOpacity={0.7}
      className="flex-row items-center justify-center gap-2 bg-primary rounded-md px-6 py-3.5"
    >
      <Text className="text-primary-foreground font-bold text-sm">
        {actionLabel}
      </Text>
    </TouchableOpacity>
  </View>
);
