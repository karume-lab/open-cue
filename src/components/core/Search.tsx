import { SearchIcon } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { MUTED_FOREGROUND } from "@/lib/colors";

interface SearchProps {
  value?: string;
  onChangeText?: (text: string) => void;
}

const Search = ({ value, onChangeText }: SearchProps) => {
  return (
    <View className="flex-1">
      <View className="flex-row gap-3 items-center bg-muted/50 border border-border/60 rounded-md px-4 h-12">
        <Icon as={SearchIcon} className="text-muted-foreground/70" size={16} />
        <Input
          className="flex-1 text-sm text-foreground border-0 shadow-none h-auto py-0 px-0"
          style={{ backgroundColor: "transparent" }}
          placeholder="Search movies, shows, anime..."
          placeholderTextColor={MUTED_FOREGROUND}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
};

export default Search;
