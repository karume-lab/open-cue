import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ListVideo, Play, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PlaylistEpisodeRow } from "@/features/playlists/components/PlaylistEpisodeRow";
import { playPlaylistItems } from "@/features/playlists/services/playback";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Playlist, PlaylistItem } from "@/types/playlist";

const PlaylistDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const playlistId = Array.isArray(params.id) ? params.id[0] : params.id;

  const playlists = useAppStore((state) => state.playlists);
  const removePlaylist = useAppStore((state) => state.removePlaylist);
  const removePlaylistItems = useAppStore((state) => state.removePlaylistItems);

  const playlist: Playlist | undefined = playlists.find(
    (playlist) => playlist.id === playlistId,
  );
  const [pendingDelete, setPendingDelete] = useState(false);

  const handlePlay = (items: PlaylistItem[], index: number) => {
    playPlaylistItems(items, index);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 pt-6 pb-2">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Icon as={ArrowLeft} size={22} className="text-foreground" />
        </TouchableOpacity>
        <Text
          className="text-foreground text-lg font-bold flex-1"
          numberOfLines={1}
        >
          {playlist?.name ?? "Playlist"}
        </Text>
        {playlist && (
          <TouchableOpacity
            onPress={() => setPendingDelete(true)}
            hitSlop={8}
            accessibilityLabel="Delete playlist"
          >
            <Icon as={Trash2} size={20} className="text-muted-foreground" />
          </TouchableOpacity>
        )}
      </View>

      {playlist && playlist.items.length > 0 && (
        <View className="px-4 py-3">
          <TouchableOpacity
            onPress={() => handlePlay(playlist.items, 0)}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-2 bg-primary rounded-md py-3.5"
          >
            <Icon
              as={Play}
              size={18}
              className="text-primary-foreground fill-primary-foreground"
            />
            <Text className="text-primary-foreground font-bold text-sm">
              Play all ({playlist.items.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {playlist ? (
        <FlatList
          data={playlist.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center pt-16 px-8 gap-3">
              <Icon
                as={ListVideo}
                size={36}
                className="text-muted-foreground/60"
              />
              <Text className="text-muted-foreground text-sm text-center">
                This playlist is empty.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <PlaylistEpisodeRow
              item={item}
              index={index}
              onPress={(pressed, i) => handlePlay(playlist.items, i)}
              onRemove={(pressed) =>
                removePlaylistItems(playlist.id, [pressed.id])
              }
            />
          )}
        />
      ) : (
        <View className="items-center justify-center pt-16 px-8">
          <Text className="text-muted-foreground text-sm text-center">
            This playlist no longer exists.
          </Text>
        </View>
      )}

      <ConfirmDialog
        open={pendingDelete}
        title="Delete playlist"
        message={`Remove "${playlist?.name ?? ""}" and its ${
          playlist?.items.length ?? 0
        } episode${(playlist?.items.length ?? 0) === 1 ? "" : "s"}?`}
        actions={[
          { label: "Cancel", variant: "outline", onPress: () => {} },
          {
            label: "Delete",
            variant: "destructive",
            onPress: () => {
              if (playlist) removePlaylist(playlist.id);
              setPendingDelete(false);
              router.back();
            },
          },
        ]}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(false);
        }}
      />
    </View>
  );
};

export default PlaylistDetailScreen;
