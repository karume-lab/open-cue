import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { runDailyBackupIfDue } from "@/services/BackupService";
import {
  routeNotificationData,
  scheduleLocalNotification,
} from "@/services/NotificationService";
import { searchTorrents } from "@/services/torrents/search";

const BACKGROUND_MOVIE_UPDATER = "BACKGROUND_MOVIE_UPDATER";

// Define the background task using expo-task-manager
TaskManager.defineTask(BACKGROUND_MOVIE_UPDATER, async () => {
  try {
    // Daily backup (silent, only when a folder is configured and a day passed).
    try {
      await runDailyBackupIfDue();
    } catch (error) {
      console.error("Background backup failed:", error);
    }

    // 1. Fetch bookmarked movies from Zustand Store
    const state = useAppStore.getState();
    const bookmarkedMovies = state.bookmarks;

    if (bookmarkedMovies.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // 2. Iterate through bookmarked movies and check for 4K releases
    for (const movie of bookmarkedMovies) {
      // 4K detection is only reliable for movies (YTS exposes quality metadata)
      if (movie.mediaType !== "movie") {
        continue;
      }

      const torrents = await searchTorrents(movie);
      const has4K = torrents.some((t) => t.quality === "2160p");

      if (has4K) {
        await scheduleLocalNotification(
          "New Quality Available!",
          `${movie.title} is now available in 4K!`,
          routeNotificationData(`/media/${movie.mediaType}/${movie.tmdbId}`),
        );
        break; // Stop after first finding to prevent notification spam
      }
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("Background task failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Runs daily when the app is launched or brought to the foreground.
export const runStartupBackups = async () => {
  try {
    await runDailyBackupIfDue();
  } catch (error) {
    console.error("Startup backup failed:", error);
  }
};

export const registerBackgroundTasks = async () => {
  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_MOVIE_UPDATER, {
      minimumInterval: 15, // 15 minutes
    });
  } catch (err) {
    console.log("Task registration failed:", err);
  }
};
