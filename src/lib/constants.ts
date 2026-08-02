export const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? "";

// Movies-only torrent source (kept for movie downloads)
export const YTS_API_BASE_URL = "https://movies-api.accel.li/api/v2";

// TV/anime torrent search sources
export const THEPIRATEBAY_API_BASE_URL = "https://apibay.org";
export const NYAA_RSS_BASE_URL = "https://nyaa.si";

export const APP_STORAGE_ID = "cue-app-storage";
// v2: bookmarks/downloads/watchHistory switched to composite string ids
// (`movie:<tmdbId>` / `tv:<tmdbId>`) with the TMDB-based unified media model.
export const APP_STORAGE_NAME = "cue-storage-v2";
