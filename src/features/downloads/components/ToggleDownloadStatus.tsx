import { Pause, Play } from "lucide-react-native";
import { TouchableOpacity } from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface ToggleDownloadStatusProps {
  isAllPaused: boolean;
  onToggle: () => void;
}

const ToggleDownloadStatus = ({
  isAllPaused,
  onToggle,
}: ToggleDownloadStatusProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
      className={cn(
        "absolute bottom-8 right-6 w-14 h-14 rounded-md items-center justify-center shadow-lg border",
        isAllPaused ? "bg-primary border-primary" : "bg-card border-border",
      )}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <Icon
        as={isAllPaused ? Play : Pause}
        size={22}
        className={
          isAllPaused
            ? "text-primary-foreground fill-primary-foreground"
            : "text-foreground"
        }
      />
    </TouchableOpacity>
  );
};

export default ToggleDownloadStatus;
