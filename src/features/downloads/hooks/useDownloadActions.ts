import { eq } from "drizzle-orm";
import { useDatabase } from "@/db";
import { movies } from "@/db/schema";

export function useDownloadActions() {
  const db = useDatabase();

  const pauseMovie = async (id: string) => {
    await db
      .update(movies)
      .set({ downloadState: "paused", downloadSpeed: 0 })
      .where(eq(movies.id, id));
  };

  const resumeMovie = async (id: string) => {
    await db
      .update(movies)
      .set({ downloadState: "downloading", downloadSpeed: 2500000 })
      .where(eq(movies.id, id));
  };

  const removeMovie = async (id: string) => {
    await db
      .update(movies)
      .set({
        downloadState: "idle",
        torrentHash: null,
        downloadProgress: 0,
        downloadSpeed: 0,
      })
      .where(eq(movies.id, id));
  };

  const pauseAll = async (movieIds: string[]) => {
    for (const id of movieIds) {
      await pauseMovie(id);
    }
  };

  const resumeAll = async (movieIds: string[]) => {
    for (const id of movieIds) {
      await resumeMovie(id);
    }
  };

  return { pauseMovie, resumeMovie, removeMovie, pauseAll, resumeAll };
}
