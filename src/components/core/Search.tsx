import { SearchIcon } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

interface SearchProps {
  value?: string;
  onChangeText?: (text: string) => void;
}

const Search = ({ value, onChangeText }: SearchProps) => {
  return (
    <View className="bg-background flex-1">
      <View className="flex-row gap-2 items-center bg-card border border-border rounded-md px-4 h-12">
        <Icon as={SearchIcon} className="text-muted-foreground" size={18} />
        <Input
          className="flex-1 text-base text-foreground bg-transparent border-0 shadow-none h-auto py-0 px-0"
          placeholder="Search movies, shows, anime..."
          placeholderTextColor="#8b9299" // --color-placeholder
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
};

export default Search;
