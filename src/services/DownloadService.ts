import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { YTSMovie } from "@/types/movie";

class DownloadManager {
  private activeIntervals: Record<string, ReturnType<typeof setInterval>> = {};

  async startDownload(movie: YTSMovie) {
    useAppStore.getState().updateDownloadState(movie.id, {
      movie,
      state: "downloading",
      progress: 0,
      speed: 2.5 * 1024 * 1024,
    });

    this.startMockProgress(movie.id);
  }

  async pauseDownload(movieIdStr: string) {
    const movieId = Number(movieIdStr);
    this.clearInterval(movieId);

    useAppStore.getState().updateDownloadState(movieId, {
      state: "paused",
      speed: 0,
    });
  }

  async resumeDownload(movieIdStr: string) {
    const movieId = Number(movieIdStr);
    useAppStore.getState().updateDownloadState(movieId, {
      state: "downloading",
    });
    this.startMockProgress(movieId);
  }

  async cancelDownload(movieIdStr: string) {
    const movieId = Number(movieIdStr);
    this.clearInterval(movieId);

    useAppStore.getState().removeDownload(movieId);

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

  private clearInterval(movieId: number) {
    if (this.activeIntervals[movieId]) {
      clearInterval(this.activeIntervals[movieId]);
      delete this.activeIntervals[movieId];
    }
  }

  private startMockProgress(movieId: number) {
    this.clearInterval(movieId);

    this.activeIntervals[movieId] = setInterval(async () => {
      const state = useAppStore.getState();
      const download = state.downloads[movieId];

      if (!download || download.state !== "downloading") {
        this.clearInterval(movieId);
        return;
      }

      const increment = 0.05; // 5% per second
      let newProgress = download.progress + increment;

      if (newProgress >= 1.0) {
        newProgress = 1.0;
        this.clearInterval(movieId);
        await this.completeDownload(download.movie);
      } else {
        useAppStore.getState().updateDownloadState(movieId, {
          progress: newProgress,
          speed: (1.5 + Math.random() * 4) * 1024 * 1024,
        });
      }
    }, 1000);
  }

  private async completeDownload(movie: YTSMovie) {
    const dir = `${documentDirectory}downloads/${movie.id}`;
    const videoPath = `${dir}/video.mp4`;
    const subPath = `${dir}/sub_en.srt`;

    try {
      await makeDirectoryAsync(dir, { intermediates: true });
      await writeAsStringAsync(videoPath, "mock video data");
      await writeAsStringAsync(subPath, "mock subtitle data");

      useAppStore.getState().updateDownloadState(movie.id, {
        progress: 1.0,
        state: "complete",
        speed: 0,
        localVideoPath: videoPath,
        localSubtitlePath: subPath,
      });
    } catch (error) {
      console.error("Failed to write mock files:", error);
    }
  }
}

export const DownloadService = new DownloadManager();
