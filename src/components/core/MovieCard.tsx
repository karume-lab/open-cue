import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { CheckCircle, Play, Star } from "lucide-react-native";
import { ImageBackground, TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { MovieSelect } from "@/db/schema";

interface MovieCardProps {
  movie: MovieSelect;
  onPress?: () => void;
}

const MovieCard = ({ movie, onPress }: MovieCardProps) => {
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
            colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)"]}
            locations={[0, 0.5, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "70%",
            }}
          />

          {movie.isOffline && (
            <View className="absolute inset-0 items-center justify-center">
              <View className="bg-black/40 rounded-full p-3 border border-white/30">
                <Icon as={Play} size={20} className="text-white fill-white" />
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
              className="text-white font-bold text-sm leading-tight"
              style={{
                height: 36,
                textShadowColor: "rgba(0,0,0,0.8)",
                textShadowRadius: 4,
              }}
              numberOfLines={2}
            >
              {movie.title}
            </Text>

            <View className="flex-row items-center justify-between">
              <Text className="text-white/70 text-[11px] font-medium">
                {releaseYear}
              </Text>
              <View className="flex-row items-center gap-1">
                <Icon as={Star} size={10} className="text-rating fill-rating" />
                <Text className="text-white/90 text-[11px] font-semibold">
                  {movie.voteAverage.toFixed(1)}
                </Text>
              </View>
            </View>

            {isInProgress && (
              <View className="h-0.5 bg-white/30 rounded-full mt-0.5">
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
