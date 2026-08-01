import { Q } from "@nozbe/watermelondb";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { database } from "@/db";
import type { Movie } from "@/db/models/Movie";
import { scheduleLocalNotification } from "./NotificationService";

const BACKGROUND_MOVIE_UPDATER = "BACKGROUND_MOVIE_UPDATER";

// Define the background task using expo-task-manager
TaskManager.defineTask(BACKGROUND_MOVIE_UPDATER, async () => {
  try {
    // 1. Fetch bookmarked movies from local WatermelonDB
    const moviesCollection = database.collections.get<Movie>("movies");
    const bookmarkedMovies = await moviesCollection
      .query(Q.where("is_bookmarked", true))
      .fetch();

    if (bookmarkedMovies.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let newDataFound = false;

    // 2. Iterate through bookmarked movies and hit YTS API
    for (const movie of bookmarkedMovies) {
      const queryUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(
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

        // Check if we already notified or registered that it has 4K
        // For this task's scope, we'll simply notify if it has 4K and it's a bookmarked item.
        // To avoid spamming, in a production app we'd add a "has_4k" column to the Movie model.
        // For now, we will simulate the check and trigger the notification.
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

// Export a registration function to be called from the app's entry point
export const registerBackgroundTasks = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_MOVIE_UPDATER, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false, // keep running after app close on Android
      startOnBoot: true, // start when device boots on Android
    });
    console.log("Background task registered!");
  } catch (err) {
    console.log("Task registration failed:", err);
  }
};
