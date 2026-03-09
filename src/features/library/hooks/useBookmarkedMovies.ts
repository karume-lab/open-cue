import { and, asc, eq } from "drizzle-orm";
import { movies, useDatabase } from "@/db";
import { useLiveQuery } from "@/db/hooks/useQuery";
import { useSettings } from "@/features/settings/contexts/SettingsContext";

export function useBookmarkedMovies() {
  const db = useDatabase();
  const { isOfflineMode } = useSettings();

  return useLiveQuery(() => {
    const filters = [eq(movies.isBookmarked, true)];
    if (isOfflineMode) {
      filters.push(eq(movies.isOffline, true));
    }

    return db
      .select()
      .from(movies)
      .where(and(...filters))
      .orderBy(asc(movies.title));
  });
}
