import type React from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const AVAILABLE_TAGS = [
  { id: "Action", label: "💥 Action" },
  { id: "Comedy", label: "🤣 Comedy" },
  { id: "Drama", label: "🎭 Drama" },
  { id: "Sci-Fi", label: "👽 Sci-Fi" },
  { id: "Horror", label: "👻 Horror" },
  { id: "Romance", label: "❤️ Romance" },
  { id: "Thriller", label: "🔪 Thriller" },
  { id: "Animation", label: "🎨 Animation" },
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
    <View className="h-64 w-full p-4 justify-center items-center border border-border bg-card rounded-md">
      <View className="flex-row flex-wrap justify-center gap-3 w-full">
        {AVAILABLE_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag.id);
          return (
            <Button
              key={tag.id}
              variant="ghost"
              onPress={() => onToggleTag(tag.id)}
              className={cn(
                "rounded-md border p-0 min-w-0 min-h-0 h-auto w-auto active:bg-transparent bg-transparent",
                isSelected
                  ? "bg-primary/15 border-primary"
                  : "bg-muted border-border",
              )}
            >
              <View className="py-3 px-4">
                <Text
                  className={cn(
                    "text-sm tracking-wide",
                    isSelected
                      ? "text-primary font-bold"
                      : "text-foreground font-normal",
                  )}
                >
                  {tag.label}
                </Text>
              </View>
            </Button>
          );
        })}
      </View>
    </View>
  );
};
