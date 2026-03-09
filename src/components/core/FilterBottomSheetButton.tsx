import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { ListFilterIcon } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const FilterBottomSheetButton = () => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["25%", "50%", "75%"], []);

  const handleOpenPress = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={2}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <View>
      <Button
        onPress={handleOpenPress}
        className="bg-card p-4 size-12 rounded-full border border-border"
      >
        <Icon as={ListFilterIcon} />
      </Button>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        index={3}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#1C1C1C" }}
        handleIndicatorStyle={{ backgroundColor: "#888888" }}
      >
        <BottomSheetView className="flex-1 p-6">
          <Text className="text-xl font-bold text-primary mb-4">
            Filter Options
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default FilterBottomSheetButton;
