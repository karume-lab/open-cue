import { Star } from "lucide-react-native";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface RatingBadgeProps {
  rating: number;
}

export const RatingBadge = ({ rating }: RatingBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className="flex-row items-center gap-1 bg-rating/10 border-rating/20 px-2 py-0.5"
    >
      <Icon as={Star} size={11} className="text-rating fill-rating" />
      <Text className="text-rating text-xs font-bold">{rating.toFixed(1)}</Text>
    </Badge>
  );
};
