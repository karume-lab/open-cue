import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StatusBar, TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  useMovieDetailsQuery,
  useSeasonEpisodesQuery,
} from "@/features/discover/services/queries";
import { SeasonEpisodesSection } from "@/features/media/components/SeasonEpisodesSection";
import {
  findFileForEpisode,
  probeTorrentFiles,
} from "@/features/media/services/packFiles";
import { findLocalEpisodeDownload } from "@/features/media/services/pickSource/nextEpisode";
import { playEpisode } from "@/features/media/services/pickSource/playActions";
import { pushToPlayer } from "@/features/media/services/pickSource/routeBuilder";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { ensureTorrentDaemon } from "@/services/daemon";
import { magnetFromHash } from "@/services/torrents/magnet";
import type { MediaType, MovieTorrent, TvEpisode } from "@/types/movie";

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

  const { data: movie } = useMovieDetailsQuery(mediaType, tmdbId);
  const {
    data: episodes,
    isLoading,
    isError,
  } = useSeasonEpisodesQuery(tmdbId, season);
  const { downloads, settings } = useAppStore();
  const [loadingEpisode, setLoadingEpisode] = useState<number | null>(null);
  const preferredQuality = settings.preferredQuality ?? "1080p";

  // 1) Play a local download of this exact episode (offline).
  // 2) Arrived via the chevron on a season pack row: stream the pack's file
  //    for the tapped episode.
  // 3) Auto-pick the best source; falls back to the targeted Sources screen.
  const handlePlay = async (episode: TvEpisode) => {
    if (!movie) return;
    const seasonNum = episode.seasonNumber ?? season;

    const local = findLocalEpisodeDownload(
      movie,
      seasonNum,
      episode.episodeNumber,
      downloads,
    );
    if (local) {
      pushToPlayer(movie, {
        mode: "local",
        downloadId: local.id,
        season: seasonNum,
        episode: episode.episodeNumber,
      });
      return;
    }

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

    await playEpisode(movie, seasonNum, episode.episodeNumber, {
      preferredQuality,
      onLoading: (loading) =>
        setLoadingEpisode(loading ? episode.episodeNumber : null),
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
        <SeasonEpisodesSection
          movie={movie ?? null}
          season={season}
          episodes={undefined}
          isLoading
          loadingEpisode={null}
          onPlayEpisode={() => {}}
        />
      ) : isError || !episodes || episodes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-2">
          <Text className="text-foreground font-bold text-base">
            No episode info
          </Text>
          <Text className="text-muted-foreground text-sm text-center">
            TMDB didn't return episode metadata for Season {season}. The Sources
            screen still lists this season's torrents.
          </Text>
        </View>
      ) : (
        <SeasonEpisodesSection
          movie={movie ?? null}
          season={season}
          episodes={episodes}
          isLoading={false}
          loadingEpisode={loadingEpisode}
          onPlayEpisode={(episode) => handlePlay(episode)}
        />
      )}
    </View>
  );
};

export default EpisodeSeasonScreen;
