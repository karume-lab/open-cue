import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { ListFilterIcon } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

// Raw hex values for native-only props — must match global.css

type SortOption = "rating" | "year" | "title";
type DownloadFilter = "downloading" | "complete" | "queued";

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "History",
  "Science Fiction",
  "Thriller",
  "Romance",
  "War",
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Rating", value: "rating" },
  { label: "Year", value: "year" },
  { label: "Title", value: "title" },
];

const DOWNLOAD_STATES: { label: string; value: DownloadFilter }[] = [
  { label: "Downloading", value: "downloading" },
  { label: "Complete", value: "complete" },
  { label: "Queued", value: "queued" },
];

export interface FilterState {
  offlineOnly: boolean;
  genres: string[];
  sortBy: SortOption;
  downloadStates: DownloadFilter[];
}

const DEFAULT_FILTERS: FilterState = {
  offlineOnly: false,
  genres: [],
  sortBy: "rating",
  downloadStates: [],
};

interface FilterBottomSheetButtonProps {
  onFilterChange?: (filters: FilterState) => void;
}

const FilterBottomSheetButton = ({
  onFilterChange,
}: FilterBottomSheetButtonProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["75%"], []);

  const [applied, setApplied] = useState<FilterState>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<FilterState>(DEFAULT_FILTERS);

  const activeFilterCount =
    (applied.offlineOnly ? 1 : 0) +
    applied.genres.length +
    applied.downloadStates.length +
    (applied.sortBy !== "rating" ? 1 : 0);

  const handleOpenPress = useCallback(() => {
    setDraft(applied);
    bottomSheetRef.current?.present();
  }, [applied]);

  const handleApply = useCallback(() => {
    setApplied(draft);
    onFilterChange?.(draft);
    bottomSheetRef.current?.dismiss();
  }, [draft, onFilterChange]);

  const handleReset = useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    onFilterChange?.(DEFAULT_FILTERS);
  }, [onFilterChange]);

  const toggleGenre = useCallback((genre: string) => {
    setDraft((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }, []);

  const toggleDownloadState = useCallback((state: DownloadFilter) => {
    setDraft((prev) => ({
      ...prev,
      downloadStates: prev.downloadStates.includes(state)
        ? prev.downloadStates.filter((s) => s !== state)
        : [...prev.downloadStates, state],
    }));
  }, []);

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

  const draftFilterCount =
    (draft.offlineOnly ? 1 : 0) +
    draft.genres.length +
    draft.downloadStates.length +
    (draft.sortBy !== "rating" ? 1 : 0);

  return (
    <View>
      <View>
        <Button
          onPress={handleOpenPress}
          className="bg-card size-12 rounded-full border border-border items-center justify-center"
        >
          <Icon as={ListFilterIcon} className="text-foreground" size={18} />
        </Button>
        {activeFilterCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-primary rounded-full size-4 items-center justify-center">
            <Text className="text-primary-foreground text-[10px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        )}
      </View>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        index={0}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#1c1c1c" /* --color-card */ }}
        handleIndicatorStyle={{
          backgroundColor: "#3c3c3c" /* --color-muted */,
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between mb-6 mt-2">
            <Text className="text-foreground text-lg font-bold">Filters</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text className="text-muted-foreground text-sm font-medium">
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          <Section label="Availability">
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-foreground/80 text-sm">Offline only</Text>
              <Switch
                checked={draft.offlineOnly}
                onCheckedChange={(val) =>
                  setDraft((p) => ({ ...p, offlineOnly: val }))
                }
              />
            </View>
          </Section>

          <Section label="Sort by">
            <View className="flex-row gap-x-2 gap-y-1 flex-wrap">
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={draft.sortBy === opt.value}
                  onPress={() => setDraft((p) => ({ ...p, sortBy: opt.value }))}
                />
              ))}
            </View>
          </Section>

          <Section label="Download state">
            <View className="flex-row gap-x-2 gap-y-1 flex-wrap">
              {DOWNLOAD_STATES.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={draft.downloadStates.includes(opt.value)}
                  onPress={() => toggleDownloadState(opt.value)}
                />
              ))}
            </View>
          </Section>

          <Section label="Genre">
            <View className="flex-row gap-x-2 gap-y-1 flex-wrap">
              {GENRES.map((genre) => (
                <Chip
                  key={genre}
                  label={genre}
                  selected={draft.genres.includes(genre)}
                  onPress={() => toggleGenre(genre)}
                />
              ))}
            </View>
          </Section>

          <TouchableOpacity
            onPress={handleApply}
            className="bg-primary rounded-2xl py-4 items-center mt-2"
          >
            <Text className="text-primary-foreground font-bold text-sm">
              {draftFilterCount > 0
                ? `Apply ${draftFilterCount} filter${draftFilterCount > 1 ? "s" : ""}`
                : "Apply"}
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
};

const Section = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View className="mb-6">
    <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">
      {label}
    </Text>
    {children}
  </View>
);

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="mb-1">
    <Badge
      variant={selected ? "default" : "outline"}
      className={selected ? "" : "border-border/50"}
    >
      <Text className="py-0.5">{label}</Text>
    </Badge>
  </TouchableOpacity>
);

export default FilterBottomSheetButton;
