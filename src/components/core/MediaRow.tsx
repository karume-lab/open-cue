import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  FlatList,
  ImageBackground,
  TouchableOpacity,
  View,
} from "react-native";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { BACKGROUND } from "@/lib/colors";
import type { Movie } from "@/types/movie";

interface MediaRowProps {
  title: string;
  movies: Movie[];
  loading?: boolean;
}

const CARD_WIDTH = 112;

const MediaCard = ({ movie }: { movie: Movie }) => {
  const coverUri = movie.medium_cover_image || movie.small_cover_image;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/media/${movie.mediaType}/${movie.tmdbId}`)}
      activeOpacity={0.75}
      style={{ width: CARD_WIDTH }}
      className="mr-3"
    >
      <ImageBackground
        source={coverUri ? { uri: coverUri } : undefined}
        className="w-full aspect-2/3 rounded-md overflow-hidden justify-end bg-muted"
        resizeMode="cover"
      >
        <LinearGradient
          colors={["transparent", `${BACKGROUND}99`, BACKGROUND]}
          locations={[0, 0.55, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "55%",
          }}
        />
        <View className="px-2 pb-2 gap-0.5">
          <Text
            className="text-foreground font-semibold text-xs leading-tight"
            numberOfLines={2}
            style={{
              height: 30,
              textShadowColor: BACKGROUND,
              textShadowRadius: 6,
              textShadowOffset: { width: 0, height: 1 },
            }}
          >
            {movie.title}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground/70 text-[10px] font-medium">
              {movie.year ? movie.year.toString() : ""}
            </Text>
            <RatingBadge rating={movie.rating} />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const MediaRow = ({ title, movies, loading }: MediaRowProps) => {
  const skeletons = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);

  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-foreground px-4 mb-3">
        {title}
      </Text>
      {loading ? (
        <View className="flex-row px-4">
          {skeletons.map((id) => (
            <View key={id} className="mr-3" style={{ width: CARD_WIDTH }}>
              <Skeleton className="w-full aspect-2/3 rounded-md" />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => <MediaCard movie={item} />}
        />
      )}
    </View>
  );
};

export default MediaRow;
