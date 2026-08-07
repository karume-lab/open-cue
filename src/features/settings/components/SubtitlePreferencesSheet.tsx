import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Minus, Plus } from "lucide-react-native";
import { forwardRef, useCallback, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import { BORDER, FOREGROUND, POPOVER } from "@/lib/colors";

const SUBTITLE_COLORS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Yellow", hex: "#FFEB3B" },
  { name: "Cyan", hex: "#00BCD4" },
  { name: "Green", hex: "#4CAF50" },
  { name: "Red", hex: "#F44336" },
];

const BACKGROUND_OPACITIES = [
  { label: "None", value: 0 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "Solid", value: 1 },
];

const SubtitlePreferencesSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { subtitlePrefs, updateSubtitlePrefs } = useSettings();

  const snapPoints = useMemo(() => ["50%"], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: POPOVER /* --color-popover */ }}
      handleIndicatorStyle={{ backgroundColor: BORDER /* --color-border */ }}
      enablePanDownToClose
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        <Text className="text-xl font-bold text-foreground mb-6">
          Subtitle Preferences
        </Text>

        {/* Font Size Section */}
        <View className="mb-8">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Font Size
          </Text>
          <View className="flex-row items-center justify-between bg-muted/30 p-4 rounded-md">
            <Button
              onPress={() =>
                updateSubtitlePrefs({
                  fontSize: Math.max(12, subtitlePrefs.fontSize - 1),
                })
              }
              variant="outline"
              size="icon"
              className="size-12 border-border/50"
            >
              {/* Minus/Plus from lucide-react-native require a raw color prop */}
              <Minus size={20} color={FOREGROUND} />
            </Button>

            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">
                {subtitlePrefs.fontSize}px
              </Text>
              <Text className="text-[10px] text-muted-foreground">
                Adjust for readability
              </Text>
            </View>

            <Button
              onPress={() =>
                updateSubtitlePrefs({
                  fontSize: Math.min(48, subtitlePrefs.fontSize + 1),
                })
              }
              variant="outline"
              size="icon"
              className="size-12 border-border/50"
            >
              <Plus size={20} color={FOREGROUND} />
            </Button>
          </View>
        </View>

        {/* Color Section */}
        <View className="mb-8">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Subtitle Color
          </Text>
          <View className="flex-row gap-4 flex-wrap">
            {SUBTITLE_COLORS.map((color) => (
              <TouchableOpacity
                key={color.hex}
                onPress={() => updateSubtitlePrefs({ color: color.hex })}
                activeOpacity={0.7}
                className={`p-1 rounded-full border-2 ${
                  subtitlePrefs.color === color.hex
                    ? "border-primary"
                    : "border-transparent"
                }`}
              >
                <View
                  style={{ backgroundColor: color.hex }}
                  className="size-12 rounded-full shadow-sm"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Background Section */}
        <View className="mb-8">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Background
          </Text>
          <View className="flex-row gap-x-2 gap-y-1 flex-wrap">
            {BACKGROUND_OPACITIES.map((bg) => {
              const selected = subtitlePrefs.backgroundOpacity === bg.value;
              return (
                <TouchableOpacity
                  key={bg.label}
                  onPress={() =>
                    updateSubtitlePrefs({ backgroundOpacity: bg.value })
                  }
                  activeOpacity={0.7}
                  className={`py-2 px-3 rounded-full border ${
                    selected
                      ? "bg-primary border-primary"
                      : "bg-card border-border/50"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      selected ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {bg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preview Section */}
        <View className="mt-auto items-center justify-center p-6 bg-background/50 border border-border/50 rounded-md">
          <Text
            style={{
              fontSize: subtitlePrefs.fontSize,
              color: subtitlePrefs.color,
              fontFamily: "Inter",
              fontWeight: "500",
              textShadowColor: "rgba(0,0,0,0.75)",
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 2,
              backgroundColor: `rgba(0, 0, 0, ${subtitlePrefs.backgroundOpacity})`,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            This is how subtitles will look.
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

SubtitlePreferencesSheet.displayName = "SubtitlePreferencesSheet";

export default SubtitlePreferencesSheet;
