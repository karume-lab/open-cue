import { View } from "react-native";
import { Text } from "@/components/ui/text";

interface ContinueWatchingProgressProps {
  progress: number;
}

// Thin progress bar shown when a title is partially watched.
export const ContinueWatchingProgress = ({
  progress,
}: ContinueWatchingProgressProps) => {
  return (
    <View className="mb-8">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-xs text-muted-foreground">Progress</Text>
        <Text className="text-xs text-muted-foreground">
          {Math.round(progress)}%
        </Text>
      </View>
      <View className="h-1 bg-muted rounded-full">
        <View
          className="h-full bg-primary rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
    </View>
  );
};
