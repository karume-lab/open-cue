import Slider from "@react-native-community/slider";
import {
  ArrowLeft,
  Pause,
  PictureInPicture2,
  Play,
  Subtitles,
} from "lucide-react-native";
import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, Platform, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface PlayerControlsProps {
  title: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playableDuration: number;
  showControls: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onBack: () => void;
  onOpenSubtitles: () => void;
  onPip?: () => void;
  onControlsInteract: () => void;
}

const formatTime = (seconds: number) => {
  if (Number.isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const PlayerControls: React.FC<PlayerControlsProps> = ({
  title,
  isPlaying,
  currentTime,
  duration,
  playableDuration,
  showControls,
  onPlayPause,
  onSeek,
  onBack,
  onOpenSubtitles,
  onPip,
  onControlsInteract,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: showControls ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showControls, fadeAnim]);

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className="absolute inset-0 justify-between bg-black/40 z-10 pointer-events-box-none"
    >
      {/* Top Bar */}
      <View
        className="flex-row items-center justify-between px-6 py-4 bg-black/30"
        style={{ paddingTop: Math.max(insets.top, 16) }}
        pointerEvents={showControls ? "auto" : "none"}
      >
        <TouchableOpacity
          onPress={onBack}
          className="size-10 rounded-full bg-black/40 items-center justify-center border border-white/10"
        >
          <Icon as={ArrowLeft} size={20} className="text-white" />
        </TouchableOpacity>
        <Text
          className="text-white font-bold text-lg flex-1 text-center mx-4"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-3">
          {onPip && Platform.OS === "android" && (
            <TouchableOpacity
              onPress={onPip}
              className="size-10 rounded-full bg-black/40 items-center justify-center border border-white/10"
            >
              <Icon as={PictureInPicture2} size={20} className="text-white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onOpenSubtitles}
            className="size-10 rounded-full bg-black/40 items-center justify-center border border-white/10"
          >
            <Icon as={Subtitles} size={20} className="text-white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Center Play/Pause */}
      <View className="flex-1 items-center justify-center pointer-events-box-none">
        <TouchableOpacity
          onPress={onPlayPause}
          disabled={!showControls}
          className="size-20 rounded-full bg-black/50 items-center justify-center border border-white/20"
        >
          <Icon
            as={isPlaying ? Pause : Play}
            size={36}
            className="text-white fill-white"
            style={isPlaying ? {} : { marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Bar */}
      <View
        className="px-8 pb-8 pt-4 bg-black/30"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        pointerEvents={showControls ? "auto" : "none"}
      >
        <View className="flex-row items-center justify-between mb-2 px-1">
          <Text className="text-white font-medium text-sm">
            {formatTime(currentTime)}
          </Text>
          <Text className="text-white/60 font-medium text-sm">
            {formatTime(duration)}
          </Text>
        </View>
        <View className="relative" style={{ height: 40 }}>
          <View
            className="absolute rounded-full bg-white/25"
            style={{
              left: 0,
              top: 18,
              height: 4,
              width: `${Math.min(
                100,
                (playableDuration / (duration > 0 ? duration : 1)) * 100,
              )}%`,
            }}
          />
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={currentTime}
            onSlidingStart={onControlsInteract}
            onValueChange={onControlsInteract}
            onSlidingComplete={(val) => {
              onSeek(val);
              onControlsInteract();
            }}
            minimumTrackTintColor="#c97742" // Burnt Orange
            maximumTrackTintColor="transparent"
            thumbTintColor="#c97742"
          />
        </View>
      </View>
    </Animated.View>
  );
};

export default PlayerControls;
