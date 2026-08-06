import { router } from "expo-router";
import { ChevronLeft, ListVideo, Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  ImageBackground,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Playlist } from "@/types/playlist";

const PlaylistsScreen = () => {
  const insets = useSafeAreaInsets();
  const playlists = useAppStore((state) => state.playlists);
  const removePlaylist = useAppStore((state) => state.removePlaylist);
  const [pendingDelete, setPendingDelete] = useState<Playlist | null>(null);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 pt-6 pb-2">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Icon as={ChevronLeft} size={22} className="text-foreground" />
        </TouchableOpacity>
        <Text className="text-foreground text-lg font-bold">Playlists</Text>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center pt-20 px-8 gap-3">
            <Icon
              as={ListVideo}
              size={36}
              className="text-muted-foreground/60"
            />
            <Text className="text-foreground font-bold text-base text-center">
              No playlists yet
            </Text>
            <Text className="text-muted-foreground text-sm text-center">
              Open a season pack, pick a few episodes, and save them as a
              playlist to binge them later.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cover = item.items[0]?.movie.medium_cover_image;
          const count = item.items.length;
          return (
            <TouchableOpacity
              onPress={() => router.push(`/playlist/${item.id}`)}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 py-3"
            >
              {cover ? (
                <ImageBackground
                  source={{ uri: cover }}
                  className="size-16 rounded-md overflow-hidden"
                  imageStyle={{ borderRadius: 6 }}
                />
              ) : (
                <View className="size-16 rounded-md bg-muted/40 items-center justify-center">
                  <Icon
                    as={ListVideo}
                    size={20}
                    className="text-muted-foreground"
                  />
                </View>
              )}
              <View className="flex-1 pr-2">
                <Text
                  className="text-foreground font-semibold text-sm"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="text-muted-foreground text-xs mt-0.5">
                  {count} episode{count === 1 ? "" : "s"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPendingDelete(item)}
                hitSlop={8}
                accessibilityLabel={`Delete ${item.name}`}
              >
                <Icon as={Trash2} size={18} className="text-muted-foreground" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete playlist"
        message={`Remove "${pendingDelete?.name ?? ""}" and its ${
          pendingDelete?.items.length ?? 0
        } episode${(pendingDelete?.items.length ?? 0) === 1 ? "" : "s"}?`}
        actions={[
          { label: "Cancel", variant: "outline", onPress: () => {} },
          {
            label: "Delete",
            variant: "destructive",
            onPress: () => {
              if (pendingDelete) removePlaylist(pendingDelete.id);
              setPendingDelete(null);
            },
          },
        ]}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </View>
  );
};

export default PlaylistsScreen;
