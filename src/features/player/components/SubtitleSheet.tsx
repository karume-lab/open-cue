import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Check, Minus, Plus } from "lucide-react-native";
import { forwardRef, useCallback, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

export interface SubtitleTrackOption {
  id: string;
  label: string;
  detail?: string;
}

interface SubtitleSheetProps {
  tracks: SubtitleTrackOption[];
  selectedTrackId: string;
  onSelectTrack: (id: string) => void;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  delay: number;
  onChangeDelay: (delay: number) => void;
}

const SubtitleSheet = forwardRef<BottomSheetModal, SubtitleSheetProps>(
  (
    {
      tracks,
      selectedTrackId,
      onSelectTrack,
      enabled,
      onToggleEnabled,
      delay,
      onChangeDelay,
    },
    ref,
  ) => {
    const snapPoints = useMemo(() => ["55%"], []);

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

    const formatDelay = (seconds: number) =>
      `${seconds > 0 ? "+" : ""}${seconds.toFixed(2)}s`;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#23282e" /* --color-popover */ }}
        handleIndicatorStyle={{
          backgroundColor: "#333a41" /* --color-border */,
        }}
        enablePanDownToClose
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xl font-bold text-foreground mb-6">
            Subtitles
          </Text>

          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-foreground/80 text-sm">Enabled</Text>
            <Switch
              checked={enabled}
              onCheckedChange={onToggleEnabled}
              accessibilityLabel="Toggle subtitles"
            />
          </View>

          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Track
          </Text>
          <View className="mb-6 overflow-hidden rounded-md border border-border/50">
            {tracks.map((track, index) => {
              const selected = selectedTrackId === track.id;
              return (
                <TouchableOpacity
                  key={track.id}
                  onPress={() => onSelectTrack(track.id)}
                  activeOpacity={0.7}
                  className={`flex-row items-center justify-between px-4 py-3.5 ${
                    index > 0 ? "border-t border-border/40" : ""
                  } ${selected ? "bg-primary/10" : "bg-muted/20"}`}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-medium ${
                        selected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {track.label}
                    </Text>
                    {track.detail && (
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {track.detail}
                      </Text>
                    )}
                  </View>
                  {selected && <IconCheck />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Sync Delay
          </Text>
          <View className="flex-row items-center justify-between bg-muted/30 p-4 rounded-md">
            <Button
              onPress={() =>
                onChangeDelay(Math.round((delay - 0.25) * 100) / 100)
              }
              variant="outline"
              size="icon"
              className="size-12 border-border/50"
              disabled={!enabled}
            >
              <Minus size={20} color="#eceff1" />
            </Button>
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">
                {formatDelay(delay)}
              </Text>
              <Text className="text-[10px] text-muted-foreground">
                Negative = earlier
              </Text>
            </View>
            <Button
              onPress={() =>
                onChangeDelay(Math.round((delay + 0.25) * 100) / 100)
              }
              variant="outline"
              size="icon"
              className="size-12 border-border/50"
              disabled={!enabled}
            >
              <Plus size={20} color="#eceff1" />
            </Button>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const IconCheck = () => (
  <View className="bg-primary rounded-full size-5 items-center justify-center">
    <Check size={13} color="#0f1114" strokeWidth={3} />
  </View>
);

SubtitleSheet.displayName = "SubtitleSheet";

export default SubtitleSheet;
