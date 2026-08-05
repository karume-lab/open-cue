export const TMDB_MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const TMDB_TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

// Genre name → TMDB genre ids, resolved per media type for discover filtering.
// Genres without a sensible TV counterpart omit the tv filter.
export const GENRE_IDS: Record<string, { movie?: number; tv?: number }> = {
  Action: { movie: 28, tv: 10759 },
  Adventure: { movie: 12, tv: 10759 },
  Animation: { movie: 16, tv: 16 },
  Comedy: { movie: 35, tv: 35 },
  Crime: { movie: 80, tv: 80 },
  Documentary: { movie: 99, tv: 99 },
  Drama: { movie: 18, tv: 18 },
  Family: { movie: 10751, tv: 10751 },
  Fantasy: { movie: 14, tv: 10765 },
  History: { movie: 36, tv: 10768 },
  Horror: { movie: 27 },
  Mystery: { movie: 9648, tv: 9648 },
  Romance: { movie: 10749, tv: 10766 },
  "Science Fiction": { movie: 878, tv: 10765 },
  Thriller: { movie: 53 },
  War: { movie: 10752, tv: 10768 },
  Western: { movie: 37, tv: 37 },
};

export const normalizeGenre = (genre?: string): string | undefined => {
  if (!genre) return undefined;
  return genre === "Sci-Fi" ? "Science Fiction" : genre;
};
