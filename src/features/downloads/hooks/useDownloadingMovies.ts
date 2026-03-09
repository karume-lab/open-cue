import { desc, inArray } from "drizzle-orm";
import { movies, useDatabase } from "@/db";
import { useLiveQuery } from "@/db/hooks/useQuery";

export function useDownloadingMovies() {
  const db = useDatabase();

  return useLiveQuery(() =>
    db
      .select()
      .from(movies)
      .where(inArray(movies.downloadState, ["queued", "downloading", "paused"]))
      .orderBy(desc(movies.downloadedAt)),
  );
}
