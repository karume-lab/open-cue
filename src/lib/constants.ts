export const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? "";

// Movies-only torrent source (kept for movie downloads)
export const YTS_API_BASE_URL = "https://movies-api.accel.li/api/v2";

// TV/anime torrent search sources
export const THEPIRATEBAY_API_BASE_URL = "https://apibay.org";
export const NYAA_RSS_BASE_URL = "https://nyaa.si";
// EZTV mirrors (rotating) for TV episode torrents queried by imdb id
export const EZTV_API_BASE_URLS = [
  "https://eztvx.to/api",
  "https://eztv.re/api",
];

// Continue Watching — percent of runtime watched before a title is
// automatically added to / removed from the Continue Watching section.
export const CONTINUE_WATCHING_MIN_PERCENT = 10;
export const CONTINUE_WATCHING_MAX_PERCENT = 95; // beyond this = fully watched

export const APP_STORAGE_ID = "cue-app-storage";
// v2: bookmarks/downloads/watchHistory switched to composite string ids
// (`movie:<tmdbId>` / `tv:<tmdbId>`) with the TMDB-based unified media model.
// v3: downloads keyed per-torrent (`<mediaId>:<torrentHash>`) with DownloadState.id.
// v4 (in-place): watchHistory entries carry the full Movie so Continue Watching
// works for any watched title; legacy numeric entries are migrated in the store.
export const APP_STORAGE_NAME = "cue-storage-v3";

export const PORTFOLIO_URL = "https://karume.vercel.app";
