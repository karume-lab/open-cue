import { Model } from "@nozbe/watermelondb";
import { date, field } from "@nozbe/watermelondb/decorators";

export class Movie extends Model {
  static table = "movies";

  @field("tmdb_id") tmdbId!: number;
  @field("title") title!: string;
  @field("poster_path") posterPath!: string;
  @field("backdrop_path") backdropPath!: string;
  @field("overview") overview!: string;
  @field("release_date") releaseDate!: string;
  @field("runtime") runtime!: number;
  @field("vote_average") voteAverage!: number;
  @field("genres") genres!: string;
  @field("is_bookmarked") isBookmarked!: boolean;
  @field("is_offline") isOffline!: boolean;
  @field("local_video_path") localVideoPath?: string;
  @field("local_subtitle_path") localSubtitlePath?: string;
  @field("torrent_hash") torrentHash?: string;
  @field("download_progress") downloadProgress!: number;
  @field("download_state") downloadState!: string;
  @field("download_speed") downloadSpeed!: number;
  @field("current_time") currentTime!: number;
  @field("duration") duration!: number;
  @date("watched_at") watchedAt!: Date;
}
