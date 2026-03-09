import { eq } from "drizzle-orm";
import { movies, useDatabase } from "@/db";
import { useLiveQuery } from "@/db/hooks/useQuery";

export function useMovie(tmdbId: number) {
  const db = useDatabase();

  const { data, isLoading } = useLiveQuery(() =>
    db.select().from(movies).where(eq(movies.tmdbId, tmdbId)),
  );

  return { movie: data?.[0] ?? null, isLoading };
}
