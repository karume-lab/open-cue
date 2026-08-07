import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import Video from "react-native-video";
import CastBackdrop from "@/features/player/components/CastBackdrop";
import CastOverlay from "@/features/player/components/CastOverlay";
import EpisodesSheet from "@/features/player/components/EpisodesSheet";
import GestureHud from "@/features/player/components/GestureHud";
import GestureLayer from "@/features/player/components/GestureLayer";
import PlayerControls from "@/features/player/components/PlayerControls";
import PlayerSpinnerOverlay from "@/features/player/components/PlayerSpinnerOverlay";
import PlayerUnavailable from "@/features/player/components/PlayerUnavailable";
import SeekPill from "@/features/player/components/SeekPill";
import SubtitleOverlay from "@/features/player/components/SubtitleOverlay";
import SubtitleSheet from "@/features/player/components/SubtitleSheet";
import UpNextCard from "@/features/player/components/UpNextCard";
import { useControlsVisibility } from "@/features/player/hooks/useControlsVisibility";
import { useGestureHud } from "@/features/player/hooks/useGestureHud";
import { usePlaybackSession } from "@/features/player/hooks/usePlaybackSession";
import { usePlaybackState } from "@/features/player/hooks/usePlaybackState";
import { usePlayerCast } from "@/features/player/hooks/usePlayerCast";
import { usePlayerMedia } from "@/features/player/hooks/usePlayerMedia";
import { usePlayerRoute } from "@/features/player/hooks/usePlayerRoute";
import { useSeekGestures } from "@/features/player/hooks/useSeekGestures";
import { useSubtitleSession } from "@/features/player/hooks/useSubtitleSession";
import { useUpNext } from "@/features/player/hooks/useUpNext";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import {
  castSeek,
  castSetMuted,
  castSetSubtitles,
  castSetVolume,
} from "@/services/CastService";

const PlayerDetailScreen = () => {
  const route = usePlayerRoute();
  const media = usePlayerMedia({
    mediaType: route.mediaType,
    tmdbId: route.tmdbId,
    isLocal: route.isLocal,
    mediaId: route.mediaId,
    downloadId: route.downloadId,
    activeSeason: route.activeSeason,
  });
  const state = usePlaybackState(route.savedCurrentTime);
  const controls = useControlsVisibility();
  const hud = useGestureHud();
  const subs = useSubtitleSession({
    isLocal: route.isLocal,
    downloadId: route.downloadId,
    ended: state.ended,
    setIsPlaying: state.setIsPlaying,
    interactControls: controls.interactControls,
  });
  const cast = usePlayerCast({
    movie: media.movie,
    mode: route.mode,
    magnet: route.magnet,
    hash: route.hash,
    isLocal: route.isLocal,
    downloadId: route.downloadId,
    savedCurrentTime: route.savedCurrentTime,
    subtitleTracks: subs.subtitleTracks,
    state,
  });
  const seeks = useSeekGestures({
    duration: state.duration,
    currentTime: state.currentTime,
    isCasting: cast.isCasting,
    castClient: cast.castClient,
    state,
  });
  const upNext = useUpNext({
    mediaType: route.mediaType,
    movie: media.movie,
    seasonEpisodes: media.seasonEpisodes,
    activeEpisodeNum: route.activeEpisodeNum,
    isLocal: route.isLocal,
    hash: route.hash,
    magnet: route.magnet,
    ended: state.ended,
    setSwitchTarget: route.setSwitchTarget,
    setSwitchFileIndex: route.setSwitchFileIndex,
    setIsSwitchLoading: route.setIsSwitchLoading,
    setResumeMode: state.setResumeMode,
    setShowControls: controls.setShowControls,
    state,
  });
  const session = usePlaybackSession({
    route,
    movie: media.movie,
    state,
    cast,
    setShowControls: controls.setShowControls,
    interactControls: controls.interactControls,
    setUpNextDismissed: upNext.setUpNextDismissed,
    setEmbeddedTracks: subs.setEmbeddedTracks,
  });
  const subtitleSheetRef = useRef<BottomSheetModal>(null);

  const { nextEpisode } = upNext;

  // The cast receiver owns subtitle track selection while casting.
  const handleSelectSubtitleTrack = (id: string) => {
    if (cast.isCasting && cast.castClient) {
      if (id === "off") {
        castSetSubtitles(cast.castClient, []);
      } else if (id === "external") {
        // External subtitle already loaded via buildMediaRequest mediaTracks
      } else if (id.startsWith("embedded:")) {
        const index = Number(id.split(":")[1]);
        castSetSubtitles(cast.castClient, [index]);
      }
    }
    subs.handleSelectSubtitleTrack(id);
  };

  const handleSeek = (time: number) => {
    if (cast.isCasting && cast.castClient) {
      castSeek(cast.castClient, time);
    } else {
      state.videoRef.current?.seek(time);
    }
    state.setCurrentTime(time);
  };

  const title = route.episodeSubtitle
    ? `${media.movie?.title ?? ""} · ${route.episodeSubtitle}`
    : (media.movie?.title ?? "");

  // Local playback resolves its movie from persisted state, so never block on
  // the network query; only the stream flow waits for TMDB metadata.
  if (route.isLocal && !media.movie) {
    return <PlayerUnavailable onBack={session.handleBack} />;
  }

  if (!route.isLocal && (media.isQueryLoading || !media.movie)) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <View className="flex-1 bg-black">
      {/* Video source — hidden when casting (TV is the display) */}
      {state.videoSource && !cast.isCasting && (
        <Video
          ref={state.videoRef}
          source={{ uri: state.videoSource }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={!state.isPlaying || state.isPreparing}
          rate={state.rate}
          selectedTextTrack={subs.videoTextTrack}
          playInBackground
          enterPictureInPictureOnLeave
          onPictureInPictureStatusChanged={session.handlePiPStatusChanged}
          onProgress={session.handleProgress}
          onLoad={session.handleLoad}
          onBuffer={session.handleBuffer}
          onError={session.handleError}
          onEnd={session.handleEnd}
          onLoadStart={() => state.setIsBuffering(true)}
          progressUpdateInterval={1000}
        />
      )}

      <SeekPill
        anim={seeks.seekPillAnim}
        delta={seeks.seekDelta}
        direction={seeks.seekDirection}
      />

      <GestureHud side={hud.side} percent={hud.percent} visible={hud.visible} />

      {cast.isCasting && (
        <CastBackdrop imageUrl={media.movie?.large_cover_image} />
      )}

      <PlayerSpinnerOverlay
        show={(state.isPreparing || state.isBuffering) && !cast.isCasting}
      />

      {/* Cast overlay — device name + volume slider */}
      {cast.isCasting && cast.castDevice && (
        <CastOverlay
          deviceName={cast.castDevice.friendlyName}
          volume={cast.castVolume}
          onVolumeChange={(v) => {
            cast.setCastVolume(v);
            if (cast.castClient) castSetVolume(cast.castClient, v);
          }}
          muted={cast.castMuted}
          onToggleMute={() => {
            const next = !cast.castMuted;
            cast.setCastMuted(next);
            if (cast.castClient) castSetMuted(cast.castClient, next);
          }}
          activeSubtitleLabel={
            subs.selectedSubtitleTrack !== "off"
              ? (subs.subtitleTracks.find(
                  (t) => t.id === subs.selectedSubtitleTrack,
                )?.label ?? null)
              : null
          }
          onStopCast={session.handleStopCast}
        />
      )}

      <GestureLayer
        onSingleTap={controls.toggleControls}
        onDoubleTapLeft={seeks.seekBackward}
        onDoubleTapRight={seeks.seekForward}
        onControlsInteract={controls.interactControls}
        onLongPressStart={seeks.handleLongPressStart}
        onLongPressEnd={seeks.handleLongPressEnd}
        onSwipeStart={hud.show}
        onSwipeUpdate={hud.update}
        onSwipeEnd={hud.hide}
      />

      <PlayerControls
        title={title}
        isPlaying={state.isPlaying}
        ended={state.ended}
        currentTime={state.currentTime}
        duration={state.duration}
        playableDuration={state.playableDuration}
        showControls={controls.showControls}
        rate={state.rate}
        onPlayPause={session.handlePlayPause}
        onReplay={session.handleReplay}
        onCycleRate={session.cycleRate}
        onSeek={handleSeek}
        onBack={session.handleBack}
        onOpenSubtitles={() => {
          state.setIsPlaying(false);
          subtitleSheetRef.current?.present();
        }}
        onOpenEpisodes={
          route.mediaType === "tv"
            ? () => {
                state.setIsPlaying(false);
                route.episodesSheetRef.current?.present();
              }
            : undefined
        }
        onPip={session.enterPictureInPicture}
        onControlsInteract={controls.interactControls}
      />

      {/* Up Next — shown when an episode ends (shows only, outside a queue) */}
      {state.ended && nextEpisode && !upNext.upNextDismissed && (
        <UpNextCard
          episode={nextEpisode}
          countdown={upNext.upNextCountdown}
          onDismiss={() => upNext.setUpNextDismissed(true)}
          onPlay={() =>
            upNext.switchToEpisode(
              nextEpisode.seasonNumber,
              nextEpisode.episodeNumber,
            )
          }
        />
      )}

      <PlayerSpinnerOverlay show={route.isSwitchLoading} dimmed />

      {subs.selectedSubtitleTrack === "external" && (
        <SubtitleOverlay
          cues={subs.subtitleCues}
          currentTime={state.currentTime}
          delay={subs.subtitlePrefs.delay}
          enabled={subs.subtitlePrefs.enabled}
          fontSize={subs.subtitlePrefs.fontSize}
          color={subs.subtitlePrefs.color}
          backgroundOpacity={subs.subtitlePrefs.backgroundOpacity}
        />
      )}

      <SubtitleSheet
        ref={subtitleSheetRef}
        tracks={subs.subtitleTracks}
        selectedTrackId={subs.selectedSubtitleTrack}
        onSelectTrack={handleSelectSubtitleTrack}
        enabled={subs.subtitlePrefs.enabled}
        onToggleEnabled={(enabled) => subs.updateSubtitlePrefs({ enabled })}
        delay={subs.subtitlePrefs.delay}
        onChangeDelay={(delay) =>
          subs.updateSubtitlePrefs({
            delay: Math.min(10, Math.max(-10, delay)),
          })
        }
      />

      {route.mediaType === "tv" && media.movie && (
        <EpisodesSheet
          key={route.activeSeason ?? 1}
          ref={route.episodesSheetRef}
          movie={media.movie}
          initialSeason={route.activeSeason ?? 1}
          onSelect={(targetSeason, targetEpisode) => {
            route.episodesSheetRef.current?.dismiss();
            upNext.setUpNextDismissed(false);
            upNext.switchToEpisode(targetSeason, targetEpisode);
          }}
        />
      )}

      {state.playbackError && (
        <MessageDialog
          open
          title={state.playbackError.title}
          message={state.playbackError.message}
          onOpenChange={(open) => {
            if (!open) {
              state.setPlaybackError(null);
              session.handleBack();
            }
          }}
        />
      )}

      <ConfirmDialog
        open={state.showResumeDialog}
        title="Resume playback?"
        message={`You left off at ${state.resumeTimeLabel}.`}
        actions={[
          {
            label: "Start over",
            variant: "outline",
            onPress: () => state.setResumeMode("restart"),
          },
          {
            label: "Resume",
            onPress: () => state.setResumeMode("resume"),
          },
        ]}
        onOpenChange={state.setShowResumeDialog}
      />
    </View>
  );
};

export default PlayerDetailScreen;
