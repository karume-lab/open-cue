import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Search, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useMovieDetailsQuery } from "@/features/discover/services/queries";
import { BulkDownloadBar } from "@/features/media/components/BulkDownloadBar";
import { FilterChip } from "@/features/media/components/FilterChip";
import { TorrentSourceList } from "@/features/media/components/TorrentSourceList";
import { useTorrentSelection } from "@/features/media/hooks/useTorrentSelection";
import { useTorrentSourceList } from "@/features/media/hooks/useTorrentSourceList";
import { pushToPlayer } from "@/features/media/services/pickSource/routeBuilder";
import { TORRENT_FILTERS } from "@/features/media/utils/torrentGroups";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { MUTED_FOREGROUND } from "@/lib/colors";
import { DownloadService } from "@/services/downloads/DownloadManager";
import { magnetFromHash } from "@/services/torrents/magnet";
import type { MovieTorrent } from "@/types/movie";

// Full-screen source picker (replaces the old torrent-picker bottom sheet).
// Explicitly lists every torrent for a title — search, filter, whole-pack
// download, and multi-select bulk download. One-tap play uses auto source
// selection instead; this screen is for when the user wants to choose.

const SourcesScreen = () => {
  const params = useLocalSearchParams<{
    type: string;
    id: string;
    mode?: string;
    season?: string;
    episode?: string;
  }>();
  const mediaType =
    (Array.isArray(params.type) ? params.type[0] : params.type) === "tv"
      ? "tv"
      : "movie";
  const tmdbId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const mode =
    (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "download"
      ? "download"
      : "stream";
  const target = {
    season:
      params.season != null
        ? Number(
            Array.isArray(params.season) ? params.season[0] : params.season,
          )
        : undefined,
    episode:
      params.episode != null
        ? Number(
            Array.isArray(params.episode) ? params.episode[0] : params.episode,
          )
        : undefined,
  };

  const {
    data: movie,
    isLoading,
    refetch,
  } = useMovieDetailsQuery(mediaType, tmdbId);

  const [downloadError, setDownloadError] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const {
    selectionMode,
    selection,
    selectedTorrents,
    toggle: toggleTorrent,
    selectAll: selectAllVisible,
    clear: clearSelection,
    toggleMode: handleToggleSelectionMode,
  } = useTorrentSelection();
  const {
    query,
    setQuery,
    filter,
    setFilter,
    showAllTorrents,
    setShowAllTorrents,
    groups,
    hasTorrents,
    results,
    filteredGroups,
    hasCollapsedTorrents,
    visibleTorrents,
    showFilters,
  } = useTorrentSourceList(movie ?? null, target);

  const handleRetry = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleOpenSeason = useCallback(
    (torrent: MovieTorrent) => {
      if (movie?.mediaType !== "tv") return;
      const season = torrent.season ?? 1;
      router.push({
        pathname: "/media/[type]/[id]/season/[season]",
        params: {
          type: movie.mediaType,
          id: movie.tmdbId,
          season: String(season),
          torrentHash: torrent.hash,
          ...(torrent.magnet
            ? { torrentMagnet: encodeURIComponent(torrent.magnet) }
            : {}),
        },
      });
    },
    [movie],
  );

  const handleSelect = useCallback(
    (torrent: MovieTorrent, selectedMode: "stream" | "download") => {
      if (!movie) return;

      // Season/series packs hold many episodes — stream via the season screen
      // (probes the pack), download the whole pack directly.
      if (
        movie.mediaType === "tv" &&
        (torrent.kind === "season" || torrent.kind === "series")
      ) {
        if (selectedMode === "stream") {
          handleOpenSeason(torrent);
        } else {
          DownloadService.startTorrentDownload(movie, torrent).catch(
            (error) => {
              setDownloadError({
                title: "Download unavailable",
                message:
                  error instanceof Error
                    ? error.message
                    : "Could not start this download.",
              });
            },
          );
        }
        return;
      }

      if (selectedMode === "stream") {
        const magnet =
          torrent.magnet ?? magnetFromHash(torrent.hash, movie.title);
        pushToPlayer(movie, {
          mode: "stream",
          magnet,
          hash: torrent.hash,
        });
        return;
      }

      DownloadService.startTorrentDownload(movie, torrent).catch((error) => {
        setDownloadError({
          title: "Download unavailable",
          message:
            error instanceof Error
              ? error.message
              : "No torrents found for this title.",
        });
      });
    },
    [movie, handleOpenSeason],
  );

  const handleBulkDownload = useCallback(() => {
    if (!movie || selectedTorrents.length === 0) return;
    let failed = 0;
    const errors: string[] = [];
    (async () => {
      for (const torrent of selectedTorrents) {
        try {
          await DownloadService.startTorrentDownload(movie, torrent);
        } catch (error) {
          failed += 1;
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      handleToggleSelectionMode();
      if (failed > 0) {
        setDownloadError({
          title: "Some downloads failed",
          message:
            errors.length > 0
              ? `${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`
              : `Could not start ${failed} download${failed > 1 ? "s" : ""}.`,
        });
      }
    })();
  }, [movie, selectedTorrents, handleToggleSelectionMode]);

  const canSelect = mode === "download" && movie?.mediaType === "tv";

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-3 gap-3 border-b border-border/40 bg-background">
        <TouchableOpacity
          onPress={() => router.back()}
          className="size-10 bg-muted items-center justify-center rounded-md border border-border/10"
        >
          <Icon as={ArrowLeft} size={20} className="text-foreground" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className="text-foreground font-bold text-base"
            numberOfLines={1}
          >
            {mode === "stream" ? "Choose what to watch" : "Choose a source"}
          </Text>
          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
            {movie?.title ?? ""}
          </Text>
        </View>
        {canSelect && !isLoading && hasTorrents && (
          <TouchableOpacity
            onPress={handleToggleSelectionMode}
            activeOpacity={0.7}
            className={`px-3 py-1.5 rounded-md border border-border/60 ${
              selectionMode ? "bg-primary border-primary" : "bg-muted/50"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectionMode ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {selectionMode ? "Done" : "Select"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Target badge */}
      {target.season != null && (
        <View className="flex-row items-center justify-between bg-primary/10 border border-primary/20 rounded-md mx-4 mt-3 px-4 py-2.5">
          <Text className="text-primary text-sm font-bold">
            {target.episode != null
              ? `S${target.season}E${target.episode}`
              : `Season ${target.season}`}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            className="p-1"
          >
            <Icon as={X} size={16} className="text-primary" />
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      {movie && !isLoading && hasTorrents && (
        <View className="flex-row items-center gap-3 bg-muted/50 border border-border/60 rounded-md px-4 mx-4 mt-3">
          <Icon as={Search} size={15} className="text-muted-foreground/70" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by title, quality, size…"
            placeholderTextColor={MUTED_FOREGROUND}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-foreground text-sm py-2.5"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={8}
              className="p-1"
            >
              <Icon as={X} size={15} className="text-muted-foreground/70" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View className="px-4 mt-3">
          <View className="flex-row gap-2 mb-3">
            {TORRENT_FILTERS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filter === option.value}
                onPress={() => setFilter(option.value)}
              />
            ))}
          </View>
          {hasCollapsedTorrents && (
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-foreground/80 text-sm">
                Show all season packs
              </Text>
              <Switch
                checked={showAllTorrents}
                onCheckedChange={setShowAllTorrents}
                accessibilityLabel="Toggle showing all season packs"
              />
            </View>
          )}
        </View>
      )}

      {/* List */}
      <TorrentSourceList
        isLoading={isLoading}
        groups={groups}
        filteredGroups={filteredGroups}
        results={results}
        query={query}
        mode={mode}
        selectionMode={selectionMode}
        selection={selection}
        target={target}
        onRetry={handleRetry}
        onShowAll={() => router.setParams({ season: "", episode: "" })}
        onSelect={handleSelect}
        onToggle={toggleTorrent}
        onOpenSeason={handleOpenSeason}
      />

      {selectionMode && selectedTorrents.length > 0 && (
        <BulkDownloadBar
          count={selectedTorrents.length}
          onSelectAll={() => selectAllVisible(visibleTorrents)}
          onClear={clearSelection}
          onDownload={handleBulkDownload}
        />
      )}

      {downloadError && (
        <MessageDialog
          open
          title={downloadError.title}
          message={downloadError.message}
          onOpenChange={(open) => {
            if (!open) setDownloadError(null);
          }}
        />
      )}
    </View>
  );
};

export default SourcesScreen;
