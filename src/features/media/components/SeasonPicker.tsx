import { ScrollView, Text, TouchableOpacity } from "react-native";

interface SeasonPickerProps {
  seasons: number[];
  activeSeason: number | undefined;
  onSelect: (season: number) => void;
}

// Horizontal season chips above the episode list.
export const SeasonPicker = ({
  seasons,
  activeSeason,
  onSelect,
}: SeasonPickerProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-3"
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {seasons.map((season) => {
        const selected = season === activeSeason;
        return (
          <TouchableOpacity
            key={season}
            onPress={() => onSelect(season)}
            activeOpacity={0.7}
            className={`px-4 py-2 rounded-md border ${
              selected ? "bg-primary border-primary" : "bg-muted border-border"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selected ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {season}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
