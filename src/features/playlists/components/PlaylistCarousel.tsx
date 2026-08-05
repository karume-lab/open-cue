import { router } from "expo-router";
import { ArrowRight, ListVideo } from "lucide-react-native";
import {
  FlatList,
  ImageBackground,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Playlist } from "@/types/playlist";

const PlaylistCard: React.FC<{ playlist: Playlist }> = ({ playlist }) => {
  const cover = playlist.items[0]?.movie.medium_cover_image;
  const count = playlist.items.length;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/playlist/${playlist.id}`)}
      activeOpacity={0.8}
      className="w-40"
    >
      {cover ? (
        <ImageBackground
          source={{ uri: cover }}
          className="h-24 rounded-md overflow-hidden justify-end"
          imageStyle={{ borderRadius: 6 }}
        >
          <View className="bg-black/60 px-2.5 py-1.5 rounded-b-md">
            <Text
              className="text-foreground text-sm font-semibold"
              numberOfLines={1}
            >
              {playlist.name}
            </Text>
            <Text className="text-muted-foreground text-[11px]">
              {count} episode{count === 1 ? "" : "s"}
            </Text>
          </View>
        </ImageBackground>
      ) : (
        <View className="h-24 rounded-md bg-muted/40 items-center justify-center gap-1.5 px-2">
          <Icon as={ListVideo} size={22} className="text-muted-foreground" />
          <Text
            className="text-foreground text-sm font-semibold text-center"
            numberOfLines={2}
          >
            {playlist.name}
          </Text>
          <Text className="text-muted-foreground text-[11px]">
            {count} episode{count === 1 ? "" : "s"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Horizontal row of saved playlists shown at the top of the Library, with a
// "View all" link to the full playlists screen.
export const PlaylistCarousel: React.FC = () => {
  const playlists = useAppStore((state) => state.playlists);

  if (playlists.length === 0) return null;

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between px-4 mb-4">
        <Text className="text-xl font-bold text-foreground">Playlists</Text>
        <TouchableOpacity
          onPress={() => router.push("/playlists")}
          hitSlop={8}
          className="flex-row items-center gap-1"
        >
          <Text className="text-primary text-sm font-semibold">View all</Text>
          <Icon as={ArrowRight} size={14} className="text-primary" />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlaylistCard playlist={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View className="w-4" />}
        style={{ alignSelf: "flex-start" }}
      />
    </View>
  );
};
