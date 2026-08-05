import { Dimensions, ScrollView, StatusBar, View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

const { height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.62;

export const MediaDetailSkeleton = () => {
  return (
    <View className="flex-1 bg-background">
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: HERO_HEIGHT }}>
          <Skeleton
            className="w-full rounded-none"
            style={{ height: HERO_HEIGHT }}
          />

          <Skeleton className="absolute top-14 left-4 size-10 rounded-md" />
          <Skeleton className="absolute top-14 right-4 size-10 rounded-md" />

          <View className="absolute bottom-0 left-0 right-0 px-5 pb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Skeleton className="size-7 rounded" />
              <Skeleton className="w-10 h-3" />
              <Skeleton className="size-1.5 rounded-full" />
              <Skeleton className="w-14 h-3" />
            </View>
            <Skeleton className="w-3/4 h-8 mb-3" />
            <View className="flex-row flex-wrap gap-2">
              <Skeleton className="w-16 h-6 rounded-md" />
              <Skeleton className="w-20 h-6 rounded-md" />
              <Skeleton className="w-14 h-6 rounded-md" />
            </View>
          </View>
        </View>

        <View className="px-5 pt-6 pb-16">
          <View className="flex-row gap-3 mb-8">
            <Skeleton className="flex-1 h-12 rounded-2xl" />
            <Skeleton className="flex-1 h-12 rounded-2xl" />
          </View>

          <View className="mb-8">
            <Skeleton className="w-20 h-5 mb-2" />
            <Skeleton className="w-full h-4 mb-2" />
            <Skeleton className="w-full h-4 mb-2" />
            <Skeleton className="w-4/5 h-4 mb-2" />
            <Skeleton className="w-2/5 h-4" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
