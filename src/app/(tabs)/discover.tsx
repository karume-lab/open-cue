import { View } from "react-native";
import FilterBottomSheet from "@/components/core/FilterBottomSheet";
import Search from "@/components/core/Search";

const DiscoverScreen = () => {
  return (
    <View>
      <Search />
      <FilterBottomSheet />

      {/* 
      filtering
      continue watching
      browsing grid -> with go to movie detail
      */}
    </View>
  );
};

export default DiscoverScreen;
