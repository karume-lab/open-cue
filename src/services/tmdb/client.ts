import { TMDB_API_BASE_URL, TMDB_API_KEY } from "@/lib/constants";

export const tmdbFetch = async <T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> => {
  if (!TMDB_API_KEY) {
    throw new Error(
      "TMDB API key is missing. Add EXPO_PUBLIC_TMDB_API_KEY to your .env file.",
    );
  }

  const search = new URLSearchParams();
  search.set("api_key", TMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const response = await fetch(
    `${TMDB_API_BASE_URL}${path}?${search.toString()}`,
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TMDB request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as T;
};
