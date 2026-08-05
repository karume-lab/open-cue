import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Calendar, Play } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  useMovieDetailsQuery,
  useSeasonEpisodesQuery,
} from "@/features/discover/services/queries";
import {
  findFileForEpisode,
  probeTorrentFiles,
} from "@/features/media/services/packFiles";
import { useMediaActions } from "@/features/shared/store/useMediaActions";
import { ensureTorrentDaemon } from "@/services/daemon";
import { magnetFromHash } from "@/services/torrents";
import type { MediaType, MovieTorrent, TvEpisode } from "@/types/movie";

const EpisodeRowSkeleton = () => (
  <View className="flex-row gap-3 py-3">
    <Skeleton className="size-24 rounded-lg" />
    <View className="flex-1 justify-center gap-2">
      <Skeleton className="w-32 h-4" />
      <Skeleton className="w-20 h-3" />
      <Skeleton className="w-full h-3" />
    </View>
    <View className="justify-center">
      <Skeleton className="size-10 rounded-xl" />
    </View>
  </View>
);

const EpisodeRow = ({
  episode,
  onPlay,
  loading = false,
}: {
  episode: TvEpisode;
  onPlay: () => void;
  loading?: boolean;
}) => (
  <View className="flex-row gap-3 py-3 border-b border-border/40">
    {episode.stillUrl ? (
      <Image
        source={{ uri: episode.stillUrl }}
        className="size-24 rounded-lg bg-muted"
        resizeMode="cover"
      />
    ) : (
      <View className="size-24 rounded-lg bg-muted items-center justify-center">
        <Text className="text-muted-foreground text-lg font-bold">
          {episode.episodeNumber}
        </Text>
      </View>
    )}

    <View className="flex-1 justify-center">
      <Text className="text-foreground font-bold text-sm">
        {episode.name || `Episode ${episode.episodeNumber}`}
      </Text>
      <View className="flex-row items-center gap-2 mt-1">
        <RatingBadge rating={episode.rating} />
        {episode.airDate && (
          <View className="flex-row items-center gap-1">
            <Icon as={Calendar} size={11} className="text-muted-foreground" />
            <Text className="text-muted-foreground text-xs">
              {episode.airDate}
            </Text>
          </View>
        )}
      </View>
      {episode.overview ? (
        <Text className="text-muted-foreground text-xs mt-1" numberOfLines={2}>
          {episode.overview}
        </Text>
      ) : null}
    </View>

    <View className="justify-center">
      <TouchableOpacity
        onPress={onPlay}
        disabled={loading}
        activeOpacity={0.7}
        className="size-11 rounded-xl bg-primary/10 items-center justify-center"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#c97742" />
        ) : (
          <Icon as={Play} size={18} className="text-primary fill-primary" />
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const EpisodeSeasonScreen = () => {
  const {
    type,
    id,
    season: seasonParam,
    torrentHash,
    torrentMagnet,
  } = useLocalSearchParams<{
    type: string;
    id: string;
    season?: string;
    torrentHash?: string;
    torrentMagnet?: string;
  }>();
  const mediaType: MediaType =
    (Array.isArray(type) ? type[0] : type) === "tv" ? "tv" : "movie";
  const tmdbId = Number(Array.isArray(id) ? id[0] : id);
  const season = Number(
    Array.isArray(seasonParam) ? seasonParam[0] : seasonParam,
  );
  const packHash = Array.isArray(torrentHash) ? torrentHash[0] : torrentHash;
  const rawMagnet = Array.isArray(torrentMagnet)
    ? torrentMagnet[0]
    : torrentMagnet;
  const packMagnet = useMemo(() => {
    if (!rawMagnet) return undefined;
    try {
      return decodeURIComponent(rawMagnet);
    } catch {
      return rawMagnet;
    }
  }, [rawMagnet]);

  const { data: movie, refetch } = useMovieDetailsQuery(mediaType, tmdbId);
  const {
    data: episodes,
    isLoading,
    isError,
  } = useSeasonEpisodesQuery(tmdbId, season);
  const { present: presentTorrentPicker } = useMediaActions();
  const [loadingEpisode, setLoadingEpisode] = useState<number | null>(null);

  // Arrived via the chevron on a season pack row: stream the pack's file for
  // the tapped episode. Falls back to the targeted torrent picker when the
  // pack can't serve that episode (no matching file, or probing failed).
  const handlePlay = async (episode: TvEpisode) => {
    if (!movie) return;

    if (packHash) {
      setLoadingEpisode(episode.episodeNumber);
      try {
        await ensureTorrentDaemon();
        const torrent: MovieTorrent = {
          url: "",
          hash: packHash,
          magnet: packMagnet,
          quality: "",
          type: "season",
          seeds: 0,
          peers: 0,
          size: "",
          size_bytes: 0,
          date_uploaded: "",
          date_uploaded_unix: 0,
          kind: "season",
          season,
        };
        const files = await probeTorrentFiles(torrent, movie.title);
        const file = findFileForEpisode(files, season, episode.episodeNumber);
        if (file) {
          const magnet =
            torrent.magnet ?? magnetFromHash(torrent.hash, movie.title);
          router.push({
            pathname: "/player/[type]/[id]",
            params: {
              type: movie.mediaType,
              id: movie.tmdbId,
              mode: "stream",
              magnet: encodeURIComponent(magnet),
              hash: torrent.hash,
              fileIndex: String(file.index),
              season: String(season),
              episode: String(episode.episodeNumber),
            },
          });
          return;
        }
      } catch (error) {
        console.error("Failed to stream episode from pack:", error);
      } finally {
        setLoadingEpisode(null);
      }
    }

    presentTorrentPicker(movie, "stream", {
      onRetry: refetch,
      target: {
        season: episode.seasonNumber ?? season,
        episode: episode.episodeNumber,
      },
    });
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-3 gap-3 border-b border-border/40 bg-background">
        <TouchableOpacity
          onPress={() => router.back()}
          className="size-10 bg-muted items-center justify-center rounded-md border border-border/10"
        >
          <Icon as={ArrowLeft} size={20} className="text-foreground" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className="text-foreground font-bold text-base"
            numberOfLines={1}
          >
            {movie?.title ?? ""}
          </Text>
          <Text className="text-muted-foreground text-xs">Season {season}</Text>
        </View>
      </View>

      {isLoading ? (
        <FlatList
          data={[0, 1, 2, 3, 4, 5]}
          keyExtractor={(item) => `sk-${item}`}
          renderItem={() => <EpisodeRowSkeleton />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      ) : isError || !episodes || episodes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-2">
          <Text className="text-foreground font-bold text-base">
            No episode info
          </Text>
          <Text className="text-muted-foreground text-sm text-center">
            TMDB didn't return episode metadata for Season {season}. The torrent
            picker still lists this season's torrents.
          </Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(episode) => String(episode.id)}
          renderItem={({ item }) => (
            <EpisodeRow
              episode={item}
              onPlay={() => handlePlay(item)}
              loading={loadingEpisode === item.episodeNumber}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default EpisodeSeasonScreen;
