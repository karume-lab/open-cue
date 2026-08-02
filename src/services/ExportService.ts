import * as MediaLibrary from "expo-media-library";
import type { DownloadState } from "@/features/shared/store/useAppStore";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { resolveDownloadFileUri } from "@/services/DownloadService";

// The album completed downloads are exported to in the device photo library.
export const CUE_ALBUM_NAME = "Cue";

export interface ExportResult {
  ok: boolean;
  message: string;
}

const exportDownload = async (downloadId: string): Promise<ExportResult> => {
  const download = useAppStore.getState().downloads[downloadId];
  if (!download) {
    return { ok: false, message: "Download not found." };
  }
  if (download.state !== "complete") {
    return { ok: false, message: "This download is not finished yet." };
  }

  const localUri = await resolveDownloadFileUri(download);
  if (!localUri) {
    return {
      ok: false,
      message: "The video file could not be located on this device.",
    };
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    return {
      ok: false,
      message: "Photo library permission was denied.",
    };
  }

  try {
    const asset = await MediaLibrary.createAssetAsync(localUri);
    await MediaLibrary.createAlbumAsync(CUE_ALBUM_NAME, asset, false);
    return {
      ok: true,
      message: `Saved to the "${CUE_ALBUM_NAME}" album in your photo library.`,
    };
  } catch (error) {
    console.error("Export failed:", error);
    return {
      ok: false,
      message: "Could not save the video to your photo library.",
    };
  }
};

const exportDownloads = async (
  downloads: DownloadState[],
): Promise<ExportResult[]> =>
  Promise.all(downloads.map((d) => exportDownload(d.id)));

export const ExportService = {
  exportDownload,
  exportDownloads,
};
