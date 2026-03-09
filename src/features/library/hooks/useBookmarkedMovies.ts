import { asc, eq } from "drizzle-orm";
import { movies, useDatabase } from "@/db";
import { useLiveQuery } from "@/db/hooks/useQuery";

export function useBookmarkedMovies() {
  const db = useDatabase();

  return useLiveQuery(() =>
    db
      .select()
      .from(movies)
      .where(eq(movies.isBookmarked, true))
      .orderBy(asc(movies.title)),
  );
}
