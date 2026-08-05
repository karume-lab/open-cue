import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, Bookmark } from "lucide-react-native";
import { Dimensions, Image, TouchableOpacity, View } from "react-native";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { BACKGROUND } from "@/lib/colors";
import type { Movie } from "@/types/movie";

const { width, height } = Dimensions.get("window");
export const HERO_HEIGHT = height * 0.62;

interface MediaHeroProps {
  movie: Movie;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

// Backdrop, scrim, back/bookmark buttons and the title/rating/genre block.
export const MediaHero = ({
  movie,
  isBookmarked,
  onToggleBookmark,
}: MediaHeroProps) => {
  const releaseYear = movie.year ? movie.year.toString() : "";
  const runtimeFormatted =
    movie.runtime >= 60
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
      : movie.runtime > 0
        ? `${movie.runtime}m`
        : movie.mediaType === "tv"
          ? "Series"
          : "";
  const genres = movie.genres || [];

  return (
    <View style={{ height: HERO_HEIGHT }}>
      <Image
        source={{ uri: movie.large_cover_image || movie.medium_cover_image }}
        style={{ width, height: HERO_HEIGHT }}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["transparent", "transparent", `${BACKGROUND}B3`, BACKGROUND]}
        locations={[0, 0.6, 0.9, 1]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-14 left-4 size-10 bg-background/40 items-center justify-center rounded-md border border-border/10"
        style={{ zIndex: 10 }}
      >
        <Icon as={ArrowLeft} size={20} className="text-foreground" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onToggleBookmark}
        className={`absolute top-14 right-4 size-10 items-center justify-center rounded-md border ${
          isBookmarked
            ? "bg-primary/20 border-primary/40"
            : "bg-background/40 border-border/10"
        }`}
        style={{ zIndex: 10 }}
      >
        <Icon
          as={Bookmark}
          size={20}
          className={
            isBookmarked ? "text-primary fill-primary" : "text-foreground"
          }
        />
      </TouchableOpacity>

      <View
        className="absolute bottom-0 left-0 right-0 px-5 pb-6"
        style={{ zIndex: 5 }}
      >
        <View className="flex-row items-center gap-2 mb-3">
          <RatingBadge rating={movie.rating} />
          <Text className="text-foreground/50 text-xs">{releaseYear}</Text>
          <Text className="text-foreground/30 text-xs">•</Text>
          <Text className="text-foreground/50 text-xs">{runtimeFormatted}</Text>
        </View>

        <Text
          className="text-foreground font-bold mb-3"
          style={{ fontSize: 28, lineHeight: 34 }}
        >
          {movie.title}
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {genres.map((genre) => (
            <View
              key={genre}
              className="bg-muted border border-border rounded-md px-3 py-1"
            >
              <Text className="text-muted-foreground text-xs font-medium">
                {genre}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};
