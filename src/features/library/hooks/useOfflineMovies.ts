import { desc, eq } from "drizzle-orm";
import { movies, useDatabase } from "@/db";
import { useLiveQuery } from "@/db/hooks/useQuery";

export function useOfflineMovies() {
  const db = useDatabase();

  return useLiveQuery(() =>
    db
      .select()
      .from(movies)
      .where(eq(movies.isOffline, true))
      .orderBy(desc(movies.downloadedAt)),
  );
}
