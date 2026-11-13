import { err, type Result } from "@omerdlw/base-framework/result";
import {
  seasonDetailsSchema,
  showDetailsSchema,
  showPageSchema,
} from "./schemas";
import {
  type SeasonDetails,
  type ShowDetails,
  type ShowPage,
  TMDB_DEFAULT_LANGUAGE,
  TMDB_REVALIDATE,
  tmdbCacheTag,
} from "./shared";
import {
  checkLanguage,
  checkPage,
  checkSearchInput,
  isTmdbId,
  type TmdbError,
  type TmdbTransport,
  tmdbErrors,
} from "./transport";

export interface ShowDetailsOptions {
  language?: string;
  signal?: AbortSignal;
}

interface SeasonOptions extends ShowDetailsOptions {
  airing?: boolean;
}

export interface ShowSearchOptions extends ShowDetailsOptions {
  page?: number;
  year?: number;
}

const SHOW_LISTS = [
  "airing_today",
  "on_the_air",
  "popular",
  "top_rated",
] as const;
export type ShowList = (typeof SHOW_LISTS)[number];

const SHOW_TRENDING_WINDOWS = ["day", "week"] as const;
type ShowTrendingWindow = (typeof SHOW_TRENDING_WINDOWS)[number];

export interface ShowListOptions {
  language?: string;
  page?: number;
  signal?: AbortSignal;
}

const APPENDED_RESOURCES = [
  "aggregate_credits",
  "images",
  "videos",
  "content_ratings",
  "recommendations",
  "watch/providers",
  "external_ids",
  "keywords",
].join(",");

const MAX_SEASON = 500;

export interface TvApi {
  getDetails(
    id: number,
    options?: ShowDetailsOptions,
  ): Promise<Result<ShowDetails, TmdbError>>;
  getSeason(
    id: number,
    season: number,
    options?: SeasonOptions,
  ): Promise<Result<SeasonDetails, TmdbError>>;
  search(
    query: string,
    options?: ShowSearchOptions,
  ): Promise<Result<ShowPage, TmdbError>>;
  trending(
    window: ShowTrendingWindow,
    options?: ShowListOptions,
  ): Promise<Result<ShowPage, TmdbError>>;
  list(
    list: ShowList,
    options?: ShowListOptions,
  ): Promise<Result<ShowPage, TmdbError>>;
}

const badId = () =>
  err(tmdbErrors.invalidRequest("Show id must be a positive integer"));

export function createTvApi(transport: TmdbTransport): TvApi {
  return {
    async getDetails(id, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
      if (!isTmdbId(id)) return badId();
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/tv/${id}`,
        query: {
          language,
          append_to_response: APPENDED_RESOURCES,
          include_image_language: `${language.slice(0, 2)},null`,
        },
        schema: showDetailsSchema,
        revalidate: TMDB_REVALIDATE.tv,
        tags: [tmdbCacheTag("tv", id)],
        signal,
      });
    },

    async getSeason(
      id,
      season,
      { airing = false, language = TMDB_DEFAULT_LANGUAGE, signal } = {},
    ) {
      if (!isTmdbId(id)) return badId();
      if (!Number.isInteger(season) || season < 0 || season > MAX_SEASON) {
        return err(tmdbErrors.invalidRequest("Unknown season"));
      }
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/tv/${id}/season/${season}`,
        query: { language },
        schema: seasonDetailsSchema,
        revalidate: airing
          ? TMDB_REVALIDATE.airingSeason
          : TMDB_REVALIDATE.season,
        tags: [
          tmdbCacheTag("tv", id),
          tmdbCacheTag("tv", id, "season", season),
        ],
        signal,
      });
    },

    async search(
      query,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal, year } = {},
    ) {
      const checked = checkSearchInput(query, page, language);
      if ("error" in checked) return err(checked.error);

      return transport.request({
        path: "/search/tv",
        query: {
          query: checked.query,
          language,
          page,
          include_adult: false,
          ...(year ? { first_air_date_year: year } : {}),
        },
        schema: showPageSchema,
        revalidate: TMDB_REVALIDATE.search,
        signal,
      });
    },

    async trending(
      window,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!SHOW_TRENDING_WINDOWS.includes(window)) {
        return err(tmdbErrors.invalidRequest(`Unknown window "${window}"`));
      }

      return transport.request({
        path: `/trending/tv/${window}`,
        query: { language, page },
        schema: showPageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover", "tv")],
        signal,
      });
    },

    async list(
      list,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!SHOW_LISTS.includes(list)) {
        return err(tmdbErrors.invalidRequest(`Unknown list "${list}"`));
      }

      return transport.request({
        path: `/tv/${list}`,
        query: { language, page, timezone: "America/New_York" },
        schema: showPageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover", "tv")],
        signal,
      });
    },
  };
}
