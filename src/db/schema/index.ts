import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { DownloadState } from "@/types/movies";

export const movies = sqliteTable(
  "movies",
  {
    id: text("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull().unique(),
    title: text("title").notNull(),
    originalTitle: text("original_title").notNull().default(""),
    overview: text("overview").notNull().default(""),
    posterPath: text("poster_path").notNull().default(""),
    backdropPath: text("backdrop_path").notNull().default(""),
    releaseDate: text("release_date").notNull().default(""),
    runtime: integer("runtime").notNull().default(0),
    voteAverage: real("vote_average").notNull().default(0),
    genres: text("genres").$type<string>().notNull().default("[]"),
    isBookmarked: integer("is_bookmarked", { mode: "boolean" })
      .notNull()
      .default(false),
    isOffline: integer("is_offline", { mode: "boolean" })
      .notNull()
      .default(false),
    localVideoPath: text("local_video_path"),
    localSubtitlePath: text("local_subtitle_path"),
    torrentHash: text("torrent_hash"),
    downloadState: text("download_state")
      .$type<DownloadState>()
      .notNull()
      .default("idle"),
    downloadProgress: real("download_progress").notNull().default(0),
    downloadSpeed: real("download_speed").notNull().default(0),
    downloadedAt: integer("downloaded_at", { mode: "timestamp" }),

    currentTime: real("current_time").notNull().default(0),
    duration: real("duration").notNull().default(0),
    watchedAt: integer("watched_at", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_tmdb_id").on(table.tmdbId),
    index("idx_is_bookmarked").on(table.isBookmarked),
    index("idx_is_offline").on(table.isOffline),
    index("idx_download_state").on(table.downloadState),
    index("idx_watched_at").on(table.watchedAt),
  ],
);

// Drizzle infers these from your schema — use them everywhere instead of hand-writing types
export type MovieInsert = typeof movies.$inferInsert;
export type MovieSelect = typeof movies.$inferSelect;
