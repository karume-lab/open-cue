import { Download } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface BulkDownloadBarProps {
  count: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDownload: () => void;
}

export const BulkDownloadBar = ({
  count,
  onSelectAll,
  onClear,
  onDownload,
}: BulkDownloadBarProps) => (
  <View className="border-t border-border/60 bg-popover px-5 pt-3 pb-6">
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-sm font-semibold text-foreground">
        {count} selected
      </Text>
      <View className="flex-row items-center gap-4">
        <TouchableOpacity onPress={onSelectAll}>
          <Text className="text-primary text-sm font-semibold">Select all</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClear}>
          <Text className="text-muted-foreground text-sm font-semibold">
            Deselect all
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    <TouchableOpacity
      onPress={onDownload}
      activeOpacity={0.8}
      className="flex-row items-center justify-center gap-2 bg-primary rounded-md py-4"
    >
      <Icon as={Download} size={18} className="text-primary-foreground" />
      <Text className="text-primary-foreground font-bold text-sm">
        Download ({count})
      </Text>
    </TouchableOpacity>
  </View>
);
