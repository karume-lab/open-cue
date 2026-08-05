import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text";

interface PlayerUnavailableProps {
  onBack: () => void;
}

// Shown when a local (download) playback cannot resolve its movie from the
// persisted state — the download is no longer on the device.
const PlayerUnavailable: React.FC<PlayerUnavailableProps> = ({ onBack }) => (
  <View className="flex-1 bg-black items-center justify-center gap-4">
    <Text className="text-white font-bold text-lg">Playback unavailable</Text>
    <Text className="text-white/60 text-sm text-center px-8">
      This download could not be found on the device.
    </Text>
    <TouchableOpacity
      onPress={onBack}
      className="bg-white/10 rounded-md px-6 py-3"
    >
      <Text className="text-white font-semibold">Go back</Text>
    </TouchableOpacity>
  </View>
);

export default PlayerUnavailable;
