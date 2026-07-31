import type { Model, Query } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import { useEffect, useMemo, useState } from "react";
import { database } from "@/db";
import type { Movie } from "@/db/models/Movie";

// Generic hook to observe a WatermelonDB query
export function useObservableQuery<T extends Model>(query: Query<T>): T[] {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    const subscription = query.observe().subscribe(setData);
    return () => subscription.unsubscribe();
  }, [query]);

  return data;
}

export function useAllMovies() {
  const query = useMemo(
    () =>
      database.collections.get<Movie>("movies").query(Q.sortBy("title", Q.asc)),
    [],
  );

  return useObservableQuery(query);
}

export function useContinueWatching() {
  const query = useMemo(
    () =>
      database.collections
        .get<Movie>("movies")
        .query(
          Q.where("current_time", Q.gt(30)),
          Q.sortBy("watched_at", Q.desc),
          Q.take(10),
        ),
    [],
  );

  return useObservableQuery(query);
}

export function useStash() {
  const query = useMemo(
    () =>
      database.collections
        .get<Movie>("movies")
        .query(Q.where("is_bookmarked", true), Q.sortBy("title", Q.asc)),
    [],
  );

  return useObservableQuery(query);
}

export function useDownloadingMovies() {
  const query = useMemo(
    () =>
      database.collections
        .get<Movie>("movies")
        .query(Q.where("download_state", Q.oneOf(["queued", "downloading"]))),
    [],
  );

  return useObservableQuery(query);
}

export function useCompletedMovies() {
  const query = useMemo(
    () =>
      database.collections
        .get<Movie>("movies")
        .query(Q.where("download_state", "complete")),
    [],
  );

  return useObservableQuery(query);
}

export function useMovie(id: string) {
  const [movie, setMovie] = useState<Movie | null>(null);

  useEffect(() => {
    if (!id) return;
    const subscription = database.collections
      .get<Movie>("movies")
      .findAndObserve(id)
      .subscribe({
        next: (m) => setMovie(m),
        error: () => setMovie(null),
      });
    return () => subscription.unsubscribe();
  }, [id]);

  return movie;
}
