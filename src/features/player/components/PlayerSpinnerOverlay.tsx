import { ActivityIndicator, View } from "react-native";
import { PRIMARY } from "@/lib/colors";

interface PlayerSpinnerOverlayProps {
  show: boolean;
  dimmed?: boolean;
}

// Full-screen loading overlay while buffering or switching episodes.
const PlayerSpinnerOverlay: React.FC<PlayerSpinnerOverlayProps> = ({
  show,
  dimmed = false,
}) => {
  if (!show) return null;
  return (
    <View
      className={
        dimmed
          ? "absolute inset-0 items-center justify-center bg-black/50 z-40"
          : "absolute inset-0 items-center justify-center"
      }
      pointerEvents="none"
    >
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );
};

export default PlayerSpinnerOverlay;
