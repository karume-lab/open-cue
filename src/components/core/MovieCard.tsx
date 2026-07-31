import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { CheckCircle, Play } from "lucide-react-native";
import { ImageBackground, TouchableOpacity, View } from "react-native";
import { useUniwind } from "uniwind";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Movie } from "@/db/models/Movie";
import { THEME } from "@/lib/theme";

interface MovieCardProps {
  movie: Movie;
  onPress?: () => void;
}

const MovieCard = ({ movie, onPress }: MovieCardProps) => {
  const { theme: mode } = useUniwind();
  const theme = THEME[(mode ?? "dark") as keyof typeof THEME];

  const progress =
    movie.duration > 0 ? (movie.currentTime / movie.duration) * 100 : 0;
  const releaseYear = movie.releaseDate ? movie.releaseDate.split("-")[0] : "";
  const isInProgress = progress > 2 && progress < 95;
  const isWatched = progress >= 95;

  return (
    <Link href={`/movies/${movie.id}`} asChild>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} className="w-56">
        <ImageBackground
          source={{ uri: movie.posterPath }}
          className="w-full h-64 rounded-2xl overflow-hidden justify-end"
          resizeMode="cover"
        >
          <LinearGradient
            colors={["transparent", "transparent", theme.background]}
            locations={[0, 0.4, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "50%",
            }}
          />

          {movie.isOffline && (
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
                textShadowColor: `${theme.background}CC`, // approx 0.8 opacity
                textShadowRadius: 4,
              }}
              numberOfLines={2}
            >
              {movie.title}
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-foreground/70 text-[11px] font-medium">
                  {releaseYear}
                </Text>
                <Text className="text-foreground/30 text-[11px]">•</Text>
                <Text className="text-foreground/70 text-[11px] font-medium">
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </Text>
              </View>
              <RatingBadge rating={movie.voteAverage} />
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
