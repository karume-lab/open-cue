import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { YTS_API_BASE_URL } from "@/lib/constants";
import { scheduleLocalNotification } from "./NotificationService";

const BACKGROUND_MOVIE_UPDATER = "BACKGROUND_MOVIE_UPDATER";

// Define the background task using expo-task-manager
TaskManager.defineTask(BACKGROUND_MOVIE_UPDATER, async () => {
  try {
    // 1. Fetch bookmarked movies from Zustand Store
    const state = useAppStore.getState();
    const bookmarkedMovies = state.bookmarks;

    if (bookmarkedMovies.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let newDataFound = false;

    // 2. Iterate through bookmarked movies and hit YTS API
    for (const movie of bookmarkedMovies) {
      const queryUrl = `${YTS_API_BASE_URL}/list_movies.json?query_term=${encodeURIComponent(
        movie.title,
      )}`;

      const response = await fetch(queryUrl);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (data.data?.movies && data.data.movies.length > 0) {
        // Find if this movie has a 2160p (4K) torrent
        const ytsMovie = data.data.movies[0];
        const has4K = ytsMovie.torrents?.some(
          (t: { quality: string }) => t.quality === "2160p",
        );

        if (has4K) {
          await scheduleLocalNotification(
            "New Quality Available!",
            `${movie.title} is now available in 4K!`,
          );
          newDataFound = true;
          break; // Stop after first finding to prevent notification spam
        }
      }
    }

    return newDataFound
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("Background fetch failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundTasks = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_MOVIE_UPDATER, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background task registered!");
  } catch (err) {
    console.log("Task registration failed:", err);
  }
};
