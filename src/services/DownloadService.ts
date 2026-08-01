import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { database } from "@/db";
import type { Movie } from "@/db/models/Movie";

class DownloadManager {
  private activeIntervals: Record<string, ReturnType<typeof setInterval>> = {};

  private async getMovie(id: string): Promise<Movie | null> {
    try {
      const movie = await database.get<Movie>("movies").find(id);
      return movie;
    } catch {
      return null;
    }
  }

  async startDownload(movieId: string) {
    const movie = await this.getMovie(movieId);
    if (!movie) return;

    await database.write(async () => {
      await movie.update((m) => {
        m.downloadState = "downloading";
        m.downloadProgress = m.downloadProgress || 0;
        m.downloadSpeed = 2.5 * 1024 * 1024; // Initial mock 2.5MB/s
      });
    });

    this.startMockProgress(movieId);
  }

  async pauseDownload(movieId: string) {
    this.clearInterval(movieId);

    const movie = await this.getMovie(movieId);
    if (movie) {
      await database.write(async () => {
        await movie.update((m) => {
          m.downloadState = "paused";
          m.downloadSpeed = 0;
        });
      });
    }
  }

  async resumeDownload(movieId: string) {
    this.startDownload(movieId);
  }

  async cancelDownload(movieId: string) {
    this.clearInterval(movieId);

    const movie = await this.getMovie(movieId);
    if (movie) {
      await database.write(async () => {
        await movie.update((m) => {
          m.downloadState = "none";
          m.downloadProgress = 0;
          m.downloadSpeed = 0;
          m.localVideoPath = undefined;
          m.localSubtitlePath = undefined;
        });
      });
    }

    // Clean up mock files
    const dir = `${documentDirectory}downloads/${movieId}`;
    try {
      const dirInfo = await getInfoAsync(dir);
      if (dirInfo.exists) {
        await deleteAsync(dir, { idempotent: true });
      }
    } catch (e) {
      console.warn("Failed to delete local files:", e);
    }
  }

  private clearInterval(movieId: string) {
    if (this.activeIntervals[movieId]) {
      clearInterval(this.activeIntervals[movieId]);
      delete this.activeIntervals[movieId];
    }
  }

  private startMockProgress(movieId: string) {
    this.clearInterval(movieId);

    this.activeIntervals[movieId] = setInterval(async () => {
      const movie = await this.getMovie(movieId);
      if (!movie) {
        this.clearInterval(movieId);
        return;
      }

      // If somehow it's no longer downloading, stop interval
      if (movie.downloadState !== "downloading") {
        this.clearInterval(movieId);
        return;
      }

      const increment = 0.05; // 5% per second
      let newProgress = movie.downloadProgress + increment;

      if (newProgress >= 1.0) {
        newProgress = 1.0;
        this.clearInterval(movieId);
        await this.completeDownload(movie);
      } else {
        await database.write(async () => {
          await movie.update((m) => {
            m.downloadProgress = newProgress;
            // Randomize speed a bit for realism between 1.5 and 5.5 MB/s
            m.downloadSpeed = (1.5 + Math.random() * 4) * 1024 * 1024;
          });
        });
      }
    }, 1000);
  }

  private async completeDownload(movie: Movie) {
    const dir = `${documentDirectory}downloads/${movie.id}`;
    const videoPath = `${dir}/video.mp4`;
    const subPath = `${dir}/sub_en.srt`;

    try {
      // Ensure directory exists
      await makeDirectoryAsync(dir, { intermediates: true });
      // Write placeholder files
      await writeAsStringAsync(videoPath, "mock video data");
      await writeAsStringAsync(subPath, "mock subtitle data");

      await database.write(async () => {
        await movie.update((m) => {
          m.downloadProgress = 1.0;
          m.downloadState = "complete";
          m.downloadSpeed = 0;
          m.localVideoPath = videoPath;
          m.localSubtitlePath = subPath;
        });
      });
    } catch (error) {
      console.error("Failed to write mock files:", error);
    }
  }
}

export const DownloadService = new DownloadManager();
