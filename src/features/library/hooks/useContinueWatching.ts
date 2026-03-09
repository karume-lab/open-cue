import { and, desc, gt, isNotNull, lt, sql } from "drizzle-orm";
import { movies, useDatabase } from "@/db";
import { useLiveQuery } from "@/db/hooks/useQuery";

export function useContinueWatching() {
  const db = useDatabase();

  return useLiveQuery(() =>
    db
      .select()
      .from(movies)
      .where(
        and(
          gt(movies.currentTime, 30),
          lt(movies.currentTime, sql`${movies.duration} - 30`),
          isNotNull(movies.watchedAt),
        ),
      )
      .orderBy(desc(movies.watchedAt))
      .limit(10),
  );
}
