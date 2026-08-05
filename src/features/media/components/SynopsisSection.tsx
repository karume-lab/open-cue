import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { Movie } from "@/types/movie";

interface SynopsisSectionProps {
  movie: Movie;
}

// Collapsible plot summary with a Read more / Show less toggle.
export const SynopsisSection = ({ movie }: SynopsisSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const longSynopsis =
    (movie.description_full?.length ?? 0) > 200 ||
    (movie.summary?.length ?? 0) > 200;

  return (
    <View className="mb-8">
      <Text className="text-base font-bold text-foreground mb-2">Synopsis</Text>
      <Text
        className="text-muted-foreground text-sm leading-relaxed"
        numberOfLines={expanded ? undefined : 4}
      >
        {movie.description_full || movie.summary}
      </Text>
      {longSynopsis && (
        <TouchableOpacity
          onPress={() => setExpanded((prev) => !prev)}
          className="mt-2"
        >
          <Text className="text-primary font-semibold text-sm">
            {expanded ? "Show less" : "Read more"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
