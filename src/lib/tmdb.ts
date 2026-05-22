const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';

export type MediaType = 'movie' | 'tv';

export interface MediaBase {
  id: number;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  overview: string;
  genre_ids?: number[];
}

export interface MovieSummary extends MediaBase {
  media_type?: 'movie';
  title: string;
  original_title: string;
  release_date: string;
}

export interface TvSummary extends MediaBase {
  media_type?: 'tv';
  name: string;
  original_name: string;
  first_air_date: string;
}

export type MediaSummary = MovieSummary | TvSummary;

export interface Genre {
  id: number;
  name: string;
}

export interface MovieDetails extends MovieSummary {
  runtime: number | null;
  genres: Genre[];
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
  homepage: string;
  production_countries: { iso_3166_1: string; name: string }[];
  belongs_to_collection: { id: number; name: string; poster_path: string | null } | null;
}

export interface TvDetails extends TvSummary {
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  genres: Genre[];
  tagline: string;
  status: string;
  in_production: boolean;
  last_air_date: string | null;
  next_episode_to_air: EpisodeSummary | null;
  seasons: SeasonSummary[];
  networks: { id: number; name: string; logo_path: string | null }[];
}

export interface SeasonSummary {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_count: number;
  poster_path: string | null;
}

export interface EpisodeSummary {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface SeasonDetails extends SeasonSummary {
  episodes: EpisodeSummary[];
}

export interface CreditPerson {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
  job?: string;
  department?: string;
  order?: number;
}

export interface Credits {
  cast: CreditPerson[];
  crew: CreditPerson[];
}

export interface WatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  link?: string;
  flatrate?: WatchProviderEntry[];
  rent?: WatchProviderEntry[];
  buy?: WatchProviderEntry[];
  free?: WatchProviderEntry[];
}

export interface Paged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type MovieDetailsFull = MovieDetails & {
  credits: Credits;
  'watch/providers': { results: Record<string, WatchProviders> };
  recommendations: Paged<MovieSummary>;
  similar: Paged<MovieSummary>;
};

export type TvDetailsFull = TvDetails & {
  credits: Credits;
  'watch/providers': { results: Record<string, WatchProviders> };
  recommendations: Paged<TvSummary>;
  similar: Paged<TvSummary>;
};

export function imgUrl(
  path: string | null | undefined,
  size: 'w92' | 'w154' | 'w185' | 'w200' | 'w300' | 'w500' | 'original' = 'w300',
): string | null {
  if (!path) return null;
  return `${TMDB_IMG}/${size}${path}`;
}

export function title(m: MediaSummary): string {
  return (m as MovieSummary).title ?? (m as TvSummary).name ?? '';
}

export function year(m: MediaSummary): string {
  const date = (m as MovieSummary).release_date ?? (m as TvSummary).first_air_date;
  return date ? date.slice(0, 4) : '';
}

export function mediaType(m: MediaSummary): MediaType {
  if (m.media_type) return m.media_type;
  return (m as MovieSummary).title !== undefined ? 'movie' : 'tv';
}

class TmdbError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getToken(): string {
  const t = import.meta.env.VITE_TMDB_TOKEN;
  if (!t) throw new TmdbError(0, 'TMDB токен не задан');
  return t;
}

async function tmdb<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('language', 'ru-RU');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.status_message) msg = body.status_message;
    } catch {}
    throw new TmdbError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  trending: (w: 'day' | 'week' = 'week') => tmdb<Paged<MediaSummary>>(`/trending/all/${w}`),
  popularMovies: (page = 1) => tmdb<Paged<MovieSummary>>(`/movie/popular`, { page }),
  popularTv: (page = 1) => tmdb<Paged<TvSummary>>(`/tv/popular`, { page }),
  nowPlaying: (page = 1) => tmdb<Paged<MovieSummary>>(`/movie/now_playing`, { page }),
  upcoming: (page = 1) => tmdb<Paged<MovieSummary>>(`/movie/upcoming`, { page }),
  airingToday: (page = 1) => tmdb<Paged<TvSummary>>(`/tv/airing_today`, { page }),
  onTheAir: (page = 1) => tmdb<Paged<TvSummary>>(`/tv/on_the_air`, { page }),
  topRatedMovies: (page = 1) => tmdb<Paged<MovieSummary>>(`/movie/top_rated`, { page }),
  topRatedTv: (page = 1) => tmdb<Paged<TvSummary>>(`/tv/top_rated`, { page }),
  search: (query: string, page = 1) =>
    tmdb<Paged<MediaSummary>>(`/search/multi`, { query, page, include_adult: false }),
  movieDetails: (id: number) =>
    tmdb<MovieDetailsFull>(`/movie/${id}`, {
      append_to_response: 'credits,watch/providers,recommendations,similar',
    }),
  tvDetails: (id: number) =>
    tmdb<TvDetailsFull>(`/tv/${id}`, {
      append_to_response: 'credits,watch/providers,recommendations,similar',
    }),
  seasonDetails: (tvId: number, season: number) =>
    tmdb<SeasonDetails>(`/tv/${tvId}/season/${season}`),
  movieGenres: () => tmdb<{ genres: Genre[] }>(`/genre/movie/list`),
  tvGenres: () => tmdb<{ genres: Genre[] }>(`/genre/tv/list`),
  discoverMovies: (opts: DiscoverOpts = {}) =>
    tmdb<Paged<MovieSummary>>(`/discover/movie`, {
      include_adult: false,
      include_video: false,
      page: opts.page ?? 1,
      sort_by: opts.sort_by ?? 'popularity.desc',
      with_genres: opts.genre_id,
      primary_release_year: opts.year,
      'vote_count.gte': opts.sort_by?.startsWith('vote_average') ? 200 : undefined,
    }),
  discoverTv: (opts: DiscoverOpts = {}) =>
    tmdb<Paged<TvSummary>>(`/discover/tv`, {
      include_adult: false,
      page: opts.page ?? 1,
      sort_by: opts.sort_by ?? 'popularity.desc',
      with_genres: opts.genre_id,
      first_air_date_year: opts.year,
      'vote_count.gte': opts.sort_by?.startsWith('vote_average') ? 100 : undefined,
    }),
};

export type DiscoverSort =
  | 'popularity.desc'
  | 'vote_average.desc'
  | 'primary_release_date.desc'
  | 'primary_release_date.asc';

export interface DiscoverOpts {
  page?: number;
  sort_by?: DiscoverSort;
  genre_id?: number;
  year?: number;
}

export { TmdbError };
