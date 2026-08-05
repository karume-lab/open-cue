import { FlatList, View } from "react-native";
import MovieCard from "@/components/core/MovieCard";
import { Text } from "@/components/ui/text";
import { useDiscoverMoviesQuery } from "@/features/discover/services/queries";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import {
  isMediaDownloaded,
  useAppStore,
  type WatchHistoryEntry,
} from "@/features/shared/store/useAppStore";
import {
  CONTINUE_WATCHING_MAX_PERCENT,
  CONTINUE_WATCHING_MIN_PERCENT,
} from "@/lib/constants";
import type { Movie } from "@/types/movie";

// An episode progress key looks like "tv:123:s01e02". Returns the base media
// key ("tv:123") plus the exact episode to resume, or null for movie entries.
const parseEpisodeKey = (
  key: string,
): { mediaId: string; season: number; episode: number } | null => {
  const match = key.match(/^(.+):s(\d{1,2})e(\d{1,2})$/);
  if (!match) return null;
  const season = Number(match[2]);
  const episode = Number(match[3]);
  if (!season || !episode) return null;
  return { mediaId: match[1], season, episode };
};

const progressPercent = (entry: WatchHistoryEntry, movie: Movie) => {
  const duration =
    movie.runtime > 0
      ? movie.runtime * 60
      : movie.mediaType === "tv"
        ? 45 * 60
        : 0;
  return duration > 0 ? (entry.currentTime / duration) * 100 : 0;
};

const ContinueWatchingCarousel = () => {
  const { isOfflineMode } = useSettings();
  const { watchHistory, downloads } = useAppStore();
  const { data } = useDiscoverMoviesQuery(1);

  // Fallback lookup for legacy history entries migrated without a stored movie.
  const allKnownMovies: Record<string, Movie> = {};

  useAppStore.getState().bookmarks.forEach((m) => {
    allKnownMovies[m.id] = m;
  });
  Object.values(useAppStore.getState().downloads).forEach((d) => {
    allKnownMovies[d.movie.id] = d.movie;
  });
  data?.data?.movies?.forEach((m) => {
    allKnownMovies[m.id] = m;
  });

  // Latest entry per title — episode entries dedupe to a single show card and
  // carry the exact episode to resume.
  const inProgress: Record<
    string,
    {
      movie: Movie;
      resumeTarget?: { season: number; episode: number };
    }
  > = {};

  for (const [id, entry] of Object.entries(watchHistory)) {
    const parsed = parseEpisodeKey(id);
    const mediaId = parsed?.mediaId ?? id;
    const movie = entry.movie ?? allKnownMovies[mediaId];
    if (!movie) continue;
    const progress = progressPercent(entry, movie);
    if (
      progress <= CONTINUE_WATCHING_MIN_PERCENT ||
      progress >= CONTINUE_WATCHING_MAX_PERCENT
    ) {
      continue;
    }
    inProgress[movie.id] = {
      movie,
      resumeTarget: parsed
        ? { season: parsed.season, episode: parsed.episode }
        : undefined,
    };
  }

  const movies = Object.values(inProgress)
    .map(({ movie }) => movie)
    .filter((movie) => {
      if (isOfflineMode && !isMediaDownloaded(downloads, movie.id))
        return false;
      return true;
    });

  const resumeTargets: Record<string, { season: number; episode: number }> = {};
  for (const { movie, resumeTarget } of Object.values(inProgress)) {
    if (resumeTarget) resumeTargets[movie.id] = resumeTarget;
  }

  if (movies.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text className="text-xl font-bold text-foreground mb-4 px-4">
        Continue Watching
      </Text>

      <FlatList
        horizontal
        data={movies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <MovieCard movie={item} resumeTarget={resumeTargets[item.id]} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View className="w-4" />}
        style={{ alignSelf: "flex-start" }}
      />
    </View>
  );
};

export default ContinueWatchingCarousel;
