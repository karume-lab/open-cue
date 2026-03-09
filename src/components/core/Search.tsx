import { SearchIcon } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

const Search = () => {
  return (
    <View className="bg-background px-4 flex-1">
      <View className="flex-row gap-2 items-center bg-card rounded-2xl px-4 py-2">
        <Icon as={SearchIcon} className="text-muted-foreground" size={20} />

        <Input
          className="flex-1 text-base text-foreground bg-transparent"
          placeholder="Search movies..."
          placeholderTextColor="#888888"
        />
      </View>
    </View>
  );
};

export default Search;
