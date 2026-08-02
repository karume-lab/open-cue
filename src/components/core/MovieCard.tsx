import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { CheckCircle, Play } from "lucide-react-native";
import { ImageBackground, TouchableOpacity, View } from "react-native";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  isMediaDownloaded,
  useAppStore,
} from "@/features/shared/store/useAppStore";
import type { Movie } from "@/types/movie";

// Raw hex values for native-only props — must match global.css
const BG = "#0f1114"; // --color-background

interface MovieCardProps {
  movie: Movie;
  onPress?: () => void;
}

export const SkeletonCard = () => {
  return (
    <View className="w-full aspect-2/3 rounded-md bg-muted/20 animate-pulse border border-border/5" />
  );
};

const MovieCard = ({ movie, onPress }: MovieCardProps) => {
  const { watchHistory, downloads } = useAppStore();
  const isOffline = isMediaDownloaded(downloads, movie.id);

  const currentTime = watchHistory[movie.id] || 0;
  const duration = movie.runtime * 60;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const releaseYear = movie.year ? movie.year.toString() : "";

  const isInProgress = progress > 2 && progress < 95;
  const isWatched = progress >= 95;

  return (
    <Link href={`/media/${movie.mediaType}/${movie.tmdbId}`} asChild>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        className="w-full"
      >
        <ImageBackground
          source={{ uri: movie.medium_cover_image }}
          className="w-full aspect-2/3 rounded-md overflow-hidden justify-end bg-muted"
          resizeMode="cover"
        >
          {/* Gradient scrim — must use native LinearGradient, so raw hex values needed */}
          <LinearGradient
            colors={["transparent", `${BG}CC`, BG]}
            locations={[0, 0.5, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "60%",
            }}
          />

          {isOffline && (
            <View className="absolute inset-0 items-center justify-center">
              <View className="bg-background/40 rounded-full p-3 border border-primary/30">
                <Icon
                  as={Play}
                  size={20}
                  className="text-primary fill-primary"
                />
              </View>
            </View>
          )}

          {isWatched && (
            <View className="absolute top-2.5 right-2.5">
              <Icon
                as={CheckCircle}
                size={16}
                className="text-primary fill-primary"
              />
            </View>
          )}

          <View className="px-3 pb-3 gap-1.5">
            <Text
              className="text-foreground font-bold text-sm leading-tight"
              style={{
                height: 36,
                // textShadow* are native-only style props, no class equivalent
                textShadowColor: BG, // --color-background
                textShadowRadius: 8,
                textShadowOffset: { width: 0, height: 2 },
              }}
              numberOfLines={2}
            >
              {movie.title}
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-foreground/80 text-[10px] font-medium">
                  {releaseYear}
                </Text>
                <Text className="text-foreground/40 text-[10px]">•</Text>
                <Text className="text-foreground/80 text-[10px] font-medium">
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </Text>
              </View>
              <RatingBadge rating={movie.rating} />
            </View>

            {isInProgress && (
              <View className="h-0.5 bg-primary/20 rounded-full mt-0.5">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </View>
            )}
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Link>
  );
};

export default MovieCard;
