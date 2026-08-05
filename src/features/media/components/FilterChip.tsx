import { TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const FilterChip = ({ label, selected, onPress }: FilterChipProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-1 rounded-md py-2 items-center border ${
      selected
        ? "bg-primary/15 border-primary/30"
        : "bg-muted/50 border-border/60"
    }`}
  >
    <Text
      className={`text-xs font-semibold ${
        selected ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
