import { YTS_API_BASE_URL } from "@/lib/constants";
import type { YTSMovie, YTSResponse } from "@/types/movie";

export const fetchMovies = async (
  page: number = 1,
  limit: number = 20,
  query?: string,
): Promise<YTSResponse> => {
  let url = `${YTS_API_BASE_URL}/list_movies.json?page=${page}&limit=${limit}`;
  if (query) {
    url += `&query_term=${encodeURIComponent(query)}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export const fetchMovie = async (id: number): Promise<YTSMovie> => {
  const url = `${YTS_API_BASE_URL}/movie_details.json?movie_id=${id}&with_images=true&with_cast=true`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  return data.data.movie;
};
