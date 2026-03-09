import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  Download,
  Pause,
  Play,
  Trash2,
} from "lucide-react-native";
import { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { useUniwind } from "uniwind";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { MOVIES } from "@/db/mock-data/movies";
import { THEME } from "@/lib/theme";

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.62;

const MoviesDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  const movie = MOVIES.find((m) => m.id === id) || MOVIES[0];
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  const releaseYear = movie.releaseDate ? movie.releaseDate.split("-")[0] : "";
  const runtimeFormatted = `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`;
  const genres: string[] = JSON.parse(movie.genres || "[]");
  const progress =
    movie.duration > 0 ? (movie.currentTime / movie.duration) * 100 : 0;

  const { theme: mode } = useUniwind();
  const theme = THEME[(mode ?? "dark") as keyof typeof THEME];

  const renderPrimaryAction = () => {
    switch (movie.downloadState) {
      case "downloading":
        return (
          <View className="flex-1">
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs font-semibold text-foreground">
                Downloading...
              </Text>
              <Text className="text-xs text-muted-foreground">
                {(movie.downloadSpeed / 1000000).toFixed(1)} MB/s
              </Text>
            </View>
            <View className="h-1 w-full bg-muted rounded-full overflow-hidden mb-3">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${movie.downloadProgress * 100}%` }}
              />
            </View>
            <TouchableOpacity className="flex-row items-center justify-center gap-2 bg-muted rounded-2xl py-4">
              <Icon as={Pause} size={18} className="text-foreground" />
              <Text className="text-foreground font-bold">Pause</Text>
            </TouchableOpacity>
          </View>
        );

      case "complete":
        return (
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4"
            onPress={() => router.push(`/player/${movie.id}`)}
          >
            <Icon
              as={Play}
              size={20}
              className="text-primary-foreground fill-primary-foreground"
            />
            <Text className="text-primary-foreground font-bold text-base">
              {progress > 2 ? "Continue Watching" : "Play Movie"}
            </Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4">
            <Icon as={Download} size={20} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold text-base">
              {movie.downloadState === "queued" ? "Queued..." : "Download"}
            </Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── HERO ── */}
        <View style={{ height: HERO_HEIGHT }}>
          <Image
            source={{ uri: movie.posterPath }}
            style={{ width, height: HERO_HEIGHT }}
            resizeMode="cover"
          />

          {/* Full gradient — transparent top, solid background bottom */}
          <LinearGradient
            colors={[
              "transparent",
              "transparent",
              `${theme.background}B3`, // 70% opacity
              theme.background,
            ]}
            locations={[0, 0.6, 0.9, 1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-14 left-4 size-10 bg-background/40 items-center justify-center rounded-full border border-border/10"
            style={{ zIndex: 10 }}
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </TouchableOpacity>

          {/* Bookmark button */}
          <TouchableOpacity
            className={`absolute top-14 right-4 size-10 items-center justify-center rounded-full border ${
              movie.isBookmarked
                ? "bg-primary/20 border-primary/40"
                : "bg-background/40 border-border/10"
            }`}
            style={{ zIndex: 10 }}
          >
            <Icon
              as={Bookmark}
              size={20}
              className={
                movie.isBookmarked
                  ? "text-primary fill-primary"
                  : "text-foreground"
              }
            />
          </TouchableOpacity>

          {/* Hero bottom — title + meta overlaid on gradient */}
          <View
            className="absolute bottom-0 left-0 right-0 px-5 pb-6"
            style={{ zIndex: 5 }}
          >
            {/* Rating + Meta row */}
            <View className="flex-row items-center gap-2 mb-3">
              <RatingBadge rating={movie.voteAverage} />
              <Text className="text-foreground/50 text-xs">{releaseYear}</Text>
              <Text className="text-foreground/30 text-xs">•</Text>
              <Text className="text-foreground/50 text-xs">
                {runtimeFormatted}
              </Text>
            </View>

            {/* Title */}
            <Text
              className="text-foreground font-bold mb-3"
              style={{
                fontSize: 28,
                lineHeight: 34,
              }}
            >
              {movie.title}
            </Text>

            {/* Genre pills */}
            <View className="flex-row flex-wrap gap-2">
              {genres.map((genre) => (
                <View
                  key={genre}
                  className="bg-muted border border-border rounded-full px-3 py-1"
                >
                  <Text className="text-muted-foreground text-xs font-medium">
                    {genre}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── CONTENT ── */}
        <View className="px-5 pt-6 pb-16">
          {/* Action row */}
          <View className="flex-row gap-3 mb-8">{renderPrimaryAction()}</View>

          {/* Progress bar — shown when in progress */}
          {progress > 2 && progress < 95 && (
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
          )}

          {/* Synopsis */}
          <View className="mb-8">
            <Text className="text-base font-bold text-foreground mb-2">
              Synopsis
            </Text>
            <Text
              className="text-muted-foreground text-sm leading-relaxed"
              numberOfLines={isSynopsisExpanded ? undefined : 4}
            >
              {movie.overview}
            </Text>
            {movie.overview.length > 200 && (
              <TouchableOpacity
                onPress={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                className="mt-2"
              >
                <Text className="text-primary font-semibold text-sm">
                  {isSynopsisExpanded ? "Show less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Local storage section */}
          {movie.isOffline && (
            <View className="bg-card rounded-2xl border border-border p-4">
              <Text className="text-sm font-bold text-foreground mb-4">
                Stored on device
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="size-10 rounded-xl bg-primary/10 items-center justify-center">
                    <Icon as={Download} size={16} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-foreground">
                      Video file
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      {movie.localSubtitlePath
                        ? "With subtitles"
                        : "No subtitles"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity className="flex-row items-center gap-1.5 bg-destructive/10 px-3 py-2 rounded-xl">
                  <Icon as={Trash2} size={14} className="text-destructive" />
                  <Text className="text-destructive text-xs font-bold">
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MoviesDetailScreen;
