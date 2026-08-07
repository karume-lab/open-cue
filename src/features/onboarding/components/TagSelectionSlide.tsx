import type React from "react";
import { TouchableOpacity, View } from "react-native";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const AVAILABLE_TAGS = [
  { id: "Action", label: "Action" },
  { id: "Comedy", label: "Comedy" },
  { id: "Drama", label: "Drama" },
  { id: "Sci-Fi", label: "Sci-Fi" },
  { id: "Horror", label: "Horror" },
  { id: "Romance", label: "Romance" },
  { id: "Thriller", label: "Thriller" },
  { id: "Animation", label: "Animation" },
];

interface TagSelectionSlideProps {
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
}

export const TagSelectionSlide: React.FC<TagSelectionSlideProps> = ({
  selectedTags,
  onToggleTag,
}) => {
  return (
    <View className="w-full p-4 justify-center items-center border border-border bg-card rounded-md">
      <View className="flex-row flex-wrap justify-center gap-2 w-full">
        {AVAILABLE_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag.id);
          return (
            <Badge
              key={tag.id}
              asChild
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "py-1.5 px-3",
                isSelected
                  ? "bg-primary border-primary"
                  : "bg-card border-border/50",
              )}
            >
              <TouchableOpacity
                onPress={() => onToggleTag(tag.id)}
                activeOpacity={0.7}
              >
                <Text
                  className={cn(
                    "text-sm font-medium pb-0.5",
                    isSelected ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            </Badge>
          );
        })}
      </View>
    </View>
  );
};
