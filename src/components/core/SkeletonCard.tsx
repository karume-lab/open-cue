import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonCard = () => {
  return (
    <View className="m-2 flex-col items-start gap-2">
      <Skeleton className="w-32 h-48 rounded-lg bg-muted" />
      <Skeleton className="w-24 h-4 rounded bg-muted" />
    </View>
  );
};

export default SkeletonCard;
