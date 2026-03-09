import { desc, eq } from "drizzle-orm";
import { movies, useDatabase } from "@/db";
import { useLiveQuery } from "@/db/hooks/useQuery";

export function useCompletedMovies() {
  const db = useDatabase();

  return useLiveQuery(() =>
    db
      .select()
      .from(movies)
      .where(eq(movies.downloadState, "complete"))
      .orderBy(desc(movies.downloadedAt)),
  );
}
