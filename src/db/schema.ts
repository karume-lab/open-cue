import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "movies",
      columns: [
        { name: "tmdb_id", type: "number", isIndexed: true },
        { name: "title", type: "string" },
        { name: "poster_path", type: "string" },
        { name: "backdrop_path", type: "string" },
        { name: "overview", type: "string" },
        { name: "release_date", type: "string" },
        { name: "runtime", type: "number" },
        { name: "vote_average", type: "number" },
        { name: "genres", type: "string" },
        { name: "is_bookmarked", type: "boolean" },
        { name: "is_offline", type: "boolean" },
        { name: "local_video_path", type: "string", isOptional: true },
        { name: "local_subtitle_path", type: "string", isOptional: true },
        { name: "torrent_hash", type: "string", isOptional: true },
        { name: "download_progress", type: "number" },
        { name: "download_state", type: "string" },
        { name: "download_speed", type: "number" },
        { name: "current_time", type: "number" },
        { name: "duration", type: "number" },
        { name: "watched_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "settings",
      columns: [
        { name: "key", type: "string", isIndexed: true },
        { name: "value", type: "string" },
      ],
    }),
  ],
});
