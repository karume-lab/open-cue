import { CheckCircle, Play, Star } from "lucide-react-native";
import React from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { Card } from "@/components/ui/card";
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
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} className="w-56">
      <Card className="w-full rounded-2xl bg-card border-0">
        <View className="h-52 w-full bg-muted">
          <Image
            source={{ uri: movie.posterPath }}
            className="w-full h-full"
            resizeMode="cover"
          />

          {movie.isOffline && (
            <View className="absolute inset-0 items-center justify-center">
              <View className="bg-primary/40 rounded-full p-2.5">
                <Icon
                  as={Play}
                  size={18}
                  className="text-primary fill-primary"
                />
              </View>
            </View>
          )}

          {isInProgress && (
            <View className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
            </View>
          )}

          {isWatched && (
            <View className="absolute bottom-2 right-2">
              <Icon
                as={CheckCircle}
                size={14}
                className="text-primary fill-primary"
              />
            </View>
          )}
        </View>

        <View className="px-2.5 pt-2 pb-3 gap-1">
          <Text
            className="text-foreground font-semibold text-xs leading-tight h-8"
            numberOfLines={2}
          >
            {movie.title}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-[11px]">
              {releaseYear}
            </Text>
            <View className="flex-row items-center gap-0.5">
              <Icon
                as={Star}
                size={10}
                className="text-yellow-400 fill-yellow-400"
              />
              <Text className="text-muted-foreground text-[11px] font-semibold">
                {movie.voteAverage.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default React.memo(MovieCard);
