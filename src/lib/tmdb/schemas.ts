import { z } from "zod";
import {
  isActingCredit,
  isCrewCredit,
  isFilmTitle,
  isTvActingCredit,
  isTvCrewCredit,
} from "./rules";

const text = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

const calendarDate = z
  .string()
  .nullish()
  .transform((value) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null,
  );

function yearOf(date: string | null): number | null {
  return date ? Number(date.slice(0, 4)) : null;
}

const timestamp = z
  .string()
  .nullish()
  .transform((value) =>
    value && !Number.isNaN(Date.parse(value)) ? value : null,
  );

const positiveOrNull = z
  .number()
  .nullish()
  .transform((value) => (value && value > 0 ? value : null));

const countOrZero = z
  .number()
  .nullish()
  .transform((value) => value ?? 0);

const genreIds = z
  .array(z.unknown())
  .nullish()
  .transform((items) =>
    (items ?? []).filter(
      (item): item is number =>
        typeof item === "number" && Number.isInteger(item),
    ),
  );

function lenientList<S extends z.ZodType>(item: S) {
  return z
    .array(z.unknown())
    .nullish()
    .transform((items): z.output<S>[] =>
      (items ?? []).flatMap((entry) => {
        const parsed = item.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      }),
    );
}

function pageSchema<S extends z.ZodType>(item: S) {
  return z
    .object({
      page: z.number().int().positive(),
      total_pages: countOrZero,
      total_results: countOrZero,
      results: lenientList(item),
    })
    .transform((p) => ({
      page: p.page,
      totalPages: p.total_pages,
      totalResults: p.total_results,
      results: p.results,
    }));
}

const movieId = z.number().int().positive();

const genre = z.object({ id: movieId, name: z.string() });

const company = z
  .object({
    id: movieId,
    name: z.string(),
    logo_path: text,
    origin_country: text,
  })
  .transform((c) => ({
    id: c.id,
    name: c.name,
    logoPath: c.logo_path,
    originCountry: c.origin_country,
  }));

const country = z
  .object({ iso_3166_1: z.string().length(2), name: z.string() })
  .transform((c) => ({ code: c.iso_3166_1, name: c.name }));

const language = z
  .object({
    iso_639_1: z.string().min(2),
    name: z.string(),
    english_name: z.string(),
  })
  .transform((l) => ({
    code: l.iso_639_1,
    name: l.name,
    englishName: l.english_name,
  }));

const collection = z
  .object({
    id: movieId,
    name: z.string(),
    poster_path: text,
    backdrop_path: text,
  })
  .transform((c) => ({
    id: c.id,
    name: c.name,
    posterPath: c.poster_path,
    backdropPath: c.backdrop_path,
  }));

const castMember = z
  .object({
    id: movieId,
    credit_id: z.string(),
    name: z.string(),
    character: text,
    order: z.number().int().nonnegative().nullish(),
    profile_path: text,
  })
  .transform((c) => ({
    id: c.id,
    creditId: c.credit_id,
    name: c.name,
    character: c.character,
    order: c.order ?? Number.MAX_SAFE_INTEGER,
    profilePath: c.profile_path,
  }));

const crewMember = z
  .object({
    id: movieId,
    credit_id: z.string(),
    name: z.string(),
    job: text,
    department: text,
    profile_path: text,
  })
  .transform((c) => ({
    id: c.id,
    creditId: c.credit_id,
    name: c.name,
    job: c.job,
    department: c.department,
    profilePath: c.profile_path,
  }));

const imageSchema = z
  .object({
    file_path: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    iso_639_1: text,
    vote_average: countOrZero,
    vote_count: countOrZero,
  })
  .transform((i) => ({
    filePath: i.file_path,
    width: i.width,
    height: i.height,
    aspectRatio: i.width / i.height,
    language: i.iso_639_1,
    voteAverage: i.vote_average,
    voteCount: i.vote_count,
  }));

const video = z
  .object({
    id: z.string(),
    key: z.string().min(1),
    name: z.string(),
    site: z.string(),
    type: z.string(),
    official: z.boolean().nullish(),
    iso_639_1: text,
    published_at: timestamp,
  })
  .transform((v) => ({
    id: v.id,
    key: v.key,
    name: v.name,
    site: v.site,
    type: v.type,
    official: v.official ?? false,
    language: v.iso_639_1,
    publishedAt: v.published_at,
  }));

const release = z
  .object({
    certification: text,
    release_date: timestamp,
    type: z.number().int().min(1).max(6),
    iso_639_1: text,
    note: text,
  })
  .transform((r) => ({
    certification: r.certification,
    releaseDate: r.release_date,
    type: r.type,
    language: r.iso_639_1,
    note: r.note,
  }));

const regionalReleases = z
  .object({
    iso_3166_1: z.string().length(2),
    release_dates: lenientList(release),
  })
  .transform((r) => ({ region: r.iso_3166_1, releases: r.release_dates }));

export const movieImagesSchema = z.object({
  backdrops: lenientList(imageSchema),
  posters: lenientList(imageSchema),
  logos: lenientList(imageSchema),
});

const movieSummarySchema = z
  .object({
    id: movieId,
    title: z.string(),
    original_title: text,
    release_date: calendarDate,
    poster_path: text,
    backdrop_path: text,
    popularity: countOrZero,
    vote_average: countOrZero,
    vote_count: countOrZero,
    genre_ids: genreIds,
    video: z.boolean().nullish(),
  })
  .transform((m) => ({
    id: m.id,
    title: m.title,
    originalTitle: m.original_title,
    releaseDate: m.release_date,
    releaseYear: yearOf(m.release_date),
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    popularity: m.popularity,
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    genreIds: m.genre_ids,
    video: m.video ?? false,
  }))
  .refine(isFilmTitle, "Not a film");

const provider = z
  .object({
    provider_id: z.number().int(),
    provider_name: z.string(),
    logo_path: text,
    display_priority: z.number().nullish(),
  })
  .transform((p) => ({
    providerId: p.provider_id,
    name: p.provider_name,
    logoPath: p.logo_path,
    displayPriority: p.display_priority ?? Number.MAX_SAFE_INTEGER,
  }));

const regionalProviders = z
  .object({
    link: text,
    flatrate: lenientList(provider),
    rent: lenientList(provider),
    buy: lenientList(provider),
    ads: lenientList(provider),
    free: lenientList(provider),
  })
  .transform((r) => ({
    link: r.link,
    flatrate: r.flatrate,
    rent: r.rent,
    buy: r.buy,
    ads: r.ads,
    free: r.free,
  }));

const providersByRegion = z
  .record(z.string(), z.unknown())
  .nullish()
  .transform((record) => {
    const result: Record<string, z.output<typeof regionalProviders>> = {};
    for (const [region, value] of Object.entries(record ?? {})) {
      const parsed = regionalProviders.safeParse(value);
      if (parsed.success) result[region] = parsed.data;
    }
    return result;
  });

const movieExternalIds = z
  .object({
    imdb_id: text,
    wikidata_id: text,
    facebook_id: text,
    instagram_id: text,
    twitter_id: text,
  })
  .partial()
  .transform((e) => ({
    imdbId: e.imdb_id ?? null,
    wikidataId: e.wikidata_id ?? null,
    facebookId: e.facebook_id ?? null,
    instagramId: e.instagram_id ?? null,
    twitterId: e.twitter_id ?? null,
  }));

const MOVIE_STATUSES = [
  "Rumored",
  "Planned",
  "In Production",
  "Post Production",
  "Released",
  "Canceled",
  "Unknown",
] as const;

const movieEmptyExternalIds = movieExternalIds.parse({});

export const movieDetailsSchema = z
  .object({
    id: movieId,
    title: z.string(),
    original_title: text,
    original_language: text,
    tagline: text,
    overview: text,
    status: z.enum(MOVIE_STATUSES).catch("Unknown"),
    release_date: calendarDate,
    runtime: positiveOrNull,
    budget: positiveOrNull,
    revenue: positiveOrNull,
    adult: z.boolean().nullish(),
    vote_average: countOrZero,
    vote_count: countOrZero,
    popularity: countOrZero,
    poster_path: text,
    backdrop_path: text,
    homepage: text,
    imdb_id: text,
    genres: lenientList(genre),
    production_companies: lenientList(company),
    production_countries: lenientList(country),
    spoken_languages: lenientList(language),
    belongs_to_collection: collection.nullish().catch(null),
    credits: z
      .object({ cast: lenientList(castMember), crew: lenientList(crewMember) })
      .nullish(),
    images: z
      .object({
        backdrops: lenientList(imageSchema),
        posters: lenientList(imageSchema),
        logos: lenientList(imageSchema),
      })
      .nullish(),
    videos: z.object({ results: lenientList(video) }).nullish(),
    release_dates: z
      .object({ results: lenientList(regionalReleases) })
      .nullish(),
    recommendations: z
      .object({ results: lenientList(movieSummarySchema) })
      .nullish(),
    "watch/providers": z.object({ results: providersByRegion }).nullish(),
    external_ids: movieExternalIds.nullish(),
    keywords: z.object({ keywords: lenientList(genre) }).nullish(),
  })
  .transform((m) => ({
    id: m.id,
    title: m.title,
    originalTitle: m.original_title,
    originalLanguage: m.original_language,
    tagline: m.tagline,
    overview: m.overview,
    status: m.status,
    releaseDate: m.release_date,
    releaseYear: yearOf(m.release_date),
    runtimeMinutes: m.runtime,
    budget: m.budget,
    revenue: m.revenue,
    adult: m.adult ?? false,
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    popularity: m.popularity,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    homepage: m.homepage,
    imdbId: m.imdb_id ?? m.external_ids?.imdbId ?? null,
    genres: m.genres,
    productionCompanies: m.production_companies,
    productionCountries: m.production_countries,
    spokenLanguages: m.spoken_languages,
    collection: m.belongs_to_collection ?? null,
    credits: m.credits ?? { cast: [], crew: [] },
    images: m.images ?? { backdrops: [], posters: [], logos: [] },
    videos: m.videos?.results ?? [],
    releaseDates: m.release_dates?.results ?? [],
    recommendations: m.recommendations?.results ?? [],
    watchProviders: m["watch/providers"]?.results ?? {},
    externalIds: m.external_ids ?? movieEmptyExternalIds,
    keywords: m.keywords?.keywords ?? [],
  }));

const id = z.number().int().positive();

const personSummarySchema = z
  .object({
    id,
    name: z.string().trim().min(1),
    known_for_department: text,
    profile_path: text,
    popularity: countOrZero,
  })
  .transform((p) => ({
    id: p.id,
    name: p.name,
    knownForDepartment: p.known_for_department,
    profilePath: p.profile_path,
    popularity: p.popularity,
  }));

const externalIds = z
  .object({
    imdb_id: text,
    wikidata_id: text,
    facebook_id: text,
    instagram_id: text,
    twitter_id: text,
    tiktok_id: text,
    youtube_id: text,
  })
  .partial()
  .transform((e) => ({
    imdbId: e.imdb_id ?? null,
    wikidataId: e.wikidata_id ?? null,
    facebookId: e.facebook_id ?? null,
    instagramId: e.instagram_id ?? null,
    twitterId: e.twitter_id ?? null,
    tiktokId: e.tiktok_id ?? null,
    youtubeId: e.youtube_id ?? null,
  }));

const emptyExternalIds = externalIds.parse({});

const creditBase = {
  id,
  credit_id: z.string(),
  title: z.string(),
  original_title: text,
  release_date: calendarDate,
  poster_path: text,
  backdrop_path: text,
  vote_average: countOrZero,
  vote_count: countOrZero,
  popularity: countOrZero,
  adult: z.boolean().nullish(),
  genre_ids: genreIds,
  video: z.boolean().nullish(),
};

function movieOf(c: {
  id: number;
  credit_id: string;
  title: string;
  original_title: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean | null;
  genre_ids: number[];
  video?: boolean | null;
}) {
  return {
    id: c.id,
    creditId: c.credit_id,
    title: c.title,
    originalTitle: c.original_title,
    releaseDate: c.release_date,
    releaseYear: yearOf(c.release_date),
    posterPath: c.poster_path,
    backdropPath: c.backdrop_path,
    voteAverage: c.vote_average,
    voteCount: c.vote_count,
    popularity: c.popularity,
    adult: c.adult ?? false,
    genreIds: c.genre_ids,
    video: c.video ?? false,
  };
}

const castCredit = z
  .object({
    ...creditBase,
    character: text,
    order: z.number().int().nonnegative().nullish(),
  })
  .transform((c) => ({
    ...movieOf(c),
    character: c.character,
    order: c.order ?? Number.MAX_SAFE_INTEGER,
  }));

const crewCredit = z
  .object({ ...creditBase, job: text, department: text })
  .transform((c) => ({
    ...movieOf(c),
    job: c.job,
    department: c.department,
  }));

const tvCreditBase = {
  id,
  credit_id: z.string(),
  name: z.string(),
  original_name: text,
  first_air_date: calendarDate,
  poster_path: text,
  backdrop_path: text,
  vote_average: countOrZero,
  vote_count: countOrZero,
  popularity: countOrZero,
  adult: z.boolean().nullish(),
  genre_ids: genreIds,
  episode_count: countOrZero,
  first_credit_air_date: calendarDate.optional(),
};

function showOf(c: {
  id: number;
  credit_id: string;
  name: string;
  original_name: string | null;
  first_air_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean | null;
  genre_ids: number[];
  episode_count: number;
  first_credit_air_date?: string | null;
}) {
  return {
    id: c.id,
    creditId: c.credit_id,
    title: c.name,
    originalTitle: c.original_name,
    releaseDate: c.first_air_date,
    releaseYear: yearOf(c.first_air_date),
    posterPath: c.poster_path,
    backdropPath: c.backdrop_path,
    voteAverage: c.vote_average,
    voteCount: c.vote_count,
    popularity: c.popularity,
    adult: c.adult ?? false,
    genreIds: c.genre_ids,
    episodeCount: c.episode_count,
    /** When this person first appeared on the show, not when it began. */
    firstCreditDate: c.first_credit_air_date ?? null,
  };
}

const tvCastCredit = z
  .object({ ...tvCreditBase, character: text })
  .transform((c) => ({ ...showOf(c), character: c.character }));

const tvCrewCredit = z
  .object({ ...tvCreditBase, job: text, department: text })
  .transform((c) => ({ ...showOf(c), job: c.job, department: c.department }));

export const personDetailsSchema = z
  .object({
    id,
    name: z.string().trim().min(1),
    also_known_as: z.array(z.string()).nullish(),
    biography: text,
    birthday: calendarDate,
    deathday: calendarDate,
    place_of_birth: text,
    known_for_department: text,
    gender: z.number().int().nullish(),
    profile_path: text,
    popularity: countOrZero,
    homepage: text,
    imdb_id: text,
    movie_credits: z
      .object({ cast: lenientList(castCredit), crew: lenientList(crewCredit) })
      .nullish(),
    tv_credits: z
      .object({
        cast: lenientList(tvCastCredit),
        crew: lenientList(tvCrewCredit),
      })
      .nullish(),
    images: z.object({ profiles: lenientList(imageSchema) }).nullish(),
    external_ids: externalIds.nullish(),
  })
  .transform((p) => ({
    id: p.id,
    name: p.name,
    alsoKnownAs: [
      ...new Set(
        (p.also_known_as ?? []).map((name) => name.trim()).filter(Boolean),
      ),
    ],
    biography: p.biography,
    birthday: p.birthday,
    deathday: p.deathday,
    placeOfBirth: p.place_of_birth,
    knownForDepartment: p.known_for_department,
    gender: p.gender ?? 0,
    profilePath: p.profile_path,
    popularity: p.popularity,
    homepage: p.homepage,
    credits: {
      cast: (p.movie_credits?.cast ?? []).filter(
        (c) => !c.adult && isActingCredit(c),
      ),
      crew: (p.movie_credits?.crew ?? []).filter(
        (c) => !c.adult && isCrewCredit(c),
      ),
    },
    tvCredits: {
      cast: (p.tv_credits?.cast ?? []).filter(
        (c) => !c.adult && isTvActingCredit(c),
      ),
      crew: (p.tv_credits?.crew ?? []).filter(
        (c) => !c.adult && isTvCrewCredit(c),
      ),
    },
    images: { profiles: p.images?.profiles ?? [] },
    externalIds: {
      ...(p.external_ids ?? emptyExternalIds),
      imdbId: p.imdb_id ?? p.external_ids?.imdbId ?? null,
    },
  }));

export const movieSearchPageSchema = pageSchema(movieSummarySchema);
const knownForSchema = z
  .object({ media_type: text, name: text, title: text })
  .transform((k) =>
    k.media_type === "movie" ? k.title : k.media_type === "tv" ? k.name : null,
  );

const personSearchResultSchema = z
  .object({ known_for: lenientList(knownForSchema) })
  .and(personSummarySchema)
  .transform(({ known_for, ...person }) => ({
    ...person,
    knownFor: known_for.filter((title): title is string => Boolean(title)),
  }));

export const personSearchPageSchema = pageSchema(personSearchResultSchema);

const featuredMovieSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string(),
    release_date: calendarDate,
    poster_path: text,
    backdrop_path: text,
    overview: text,
    popularity: countOrZero,
    vote_count: countOrZero,
    vote_average: z.number().nullish(),
    genre_ids: genreIds,
    video: z.boolean().nullish(),
  })
  .transform((m) => ({
    id: m.id,
    title: m.title,
    releaseDate: m.release_date,
    releaseYear: yearOf(m.release_date),
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    overview: m.overview,
    popularity: m.popularity,
    voteCount: m.vote_count,
    voteAverage: m.vote_average ?? null,
    genreIds: m.genre_ids,
    video: m.video ?? false,
  }))
  .refine(isFilmTitle, "Not a film");

export const featuredMoviePageSchema = pageSchema(featuredMovieSchema);

export const foundMoviesSchema = z
  .object({ movie_results: lenientList(featuredMovieSchema) })
  .transform((found) => found.movie_results);

// ── TV ─────────────────────────────────────────────────────────────────────

const originCountries = z
  .array(z.unknown())
  .nullish()
  .transform((items) =>
    (items ?? []).filter(
      (item): item is string => typeof item === "string" && item.length === 2,
    ),
  );

const showSummarySchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    original_name: text,
    original_language: text,
    first_air_date: calendarDate,
    poster_path: text,
    backdrop_path: text,
    overview: text,
    popularity: countOrZero,
    vote_count: countOrZero,
    vote_average: z.number().nullish(),
    genre_ids: genreIds,
    origin_country: originCountries,
    adult: z.boolean().nullish(),
  })
  .transform((m) => ({
    id: m.id,
    title: m.name,
    originalTitle: m.original_name,
    originalLanguage: m.original_language,
    releaseDate: m.first_air_date,
    releaseYear: yearOf(m.first_air_date),
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    overview: m.overview,
    popularity: m.popularity,
    voteCount: m.vote_count,
    voteAverage: m.vote_average ?? null,
    genreIds: m.genre_ids,
    originCountries: m.origin_country,
    adult: m.adult ?? false,
  }));

export const showPageSchema = pageSchema(showSummarySchema);

export const foundShowsSchema = z
  .object({ tv_results: lenientList(showSummarySchema) })
  .transform((f) => f.tv_results);

const showRole = z
  .object({
    credit_id: z.string(),
    character: text,
    episode_count: countOrZero,
  })
  .transform((r) => ({
    creditId: r.credit_id,
    character: r.character,
    episodeCount: r.episode_count,
  }));

const showJob = z
  .object({ credit_id: z.string(), job: text, episode_count: countOrZero })
  .transform((j) => ({
    creditId: j.credit_id,
    job: j.job,
    episodeCount: j.episode_count,
  }));

// aggregate_credits: one row per person with every role they played.
const showCastMember = z
  .object({
    id: movieId,
    name: z.string(),
    profile_path: text,
    order: z.number().int().nonnegative().nullish(),
    total_episode_count: countOrZero,
    roles: lenientList(showRole),
  })
  .transform((c) => {
    const main = [...c.roles].sort(
      (a, b) => b.episodeCount - a.episodeCount,
    )[0];
    return {
      id: c.id,
      creditId: main?.creditId ?? `${c.id}`,
      name: c.name,
      character:
        c.roles
          .map((role) => role.character)
          .filter(Boolean)
          .slice(0, 2)
          .join(" / ") || null,
      order: c.order ?? Number.MAX_SAFE_INTEGER,
      profilePath: c.profile_path,
      episodeCount: c.total_episode_count,
    };
  });

const showCrewMember = z
  .object({
    id: movieId,
    name: z.string(),
    profile_path: text,
    department: text,
    total_episode_count: countOrZero,
    jobs: lenientList(showJob),
  })
  .transform((c) => {
    const main = [...c.jobs].sort((a, b) => b.episodeCount - a.episodeCount)[0];
    return {
      id: c.id,
      creditId: main?.creditId ?? `${c.id}`,
      name: c.name,
      job: main?.job ?? null,
      department: c.department,
      profilePath: c.profile_path,
      episodeCount: c.total_episode_count,
    };
  });

const showCreator = z
  .object({ id: movieId, name: z.string(), profile_path: text })
  .transform((c) => ({ id: c.id, name: c.name, profilePath: c.profile_path }));

const episodeSchema = z
  .object({
    id: z.number().int().positive(),
    season_number: z.number().int().nonnegative(),
    episode_number: z.number().int().positive(),
    name: text,
    overview: text,
    air_date: calendarDate,
    runtime: positiveOrNull,
    still_path: text,
    vote_average: countOrZero,
    vote_count: countOrZero,
    episode_type: text,
  })
  .transform((e) => ({
    id: e.id,
    seasonNumber: e.season_number,
    episodeNumber: e.episode_number,
    name: e.name,
    overview: e.overview,
    airDate: e.air_date,
    runtimeMinutes: e.runtime,
    stillPath: e.still_path,
    voteAverage: e.vote_average,
    voteCount: e.vote_count,
    episodeType: e.episode_type,
  }));

const seasonSummary = z
  .object({
    id: z.number().int().positive(),
    season_number: z.number().int().nonnegative(),
    name: text,
    overview: text,
    air_date: calendarDate,
    episode_count: countOrZero,
    poster_path: text,
    vote_average: countOrZero,
  })
  .transform((s) => ({
    id: s.id,
    seasonNumber: s.season_number,
    name: s.name,
    overview: s.overview,
    airDate: s.air_date,
    year: yearOf(s.air_date),
    episodeCount: s.episode_count,
    posterPath: s.poster_path,
    voteAverage: s.vote_average,
  }));

const contentRating = z
  .object({ iso_3166_1: z.string().length(2), rating: text })
  .transform((r) => ({ region: r.iso_3166_1, rating: r.rating }));

const showExternalIds = z
  .object({
    imdb_id: text,
    tvdb_id: z.number().nullish(),
    wikidata_id: text,
    facebook_id: text,
    instagram_id: text,
    twitter_id: text,
  })
  .partial()
  .transform((e) => ({
    imdbId: e.imdb_id ?? null,
    tvdbId: e.tvdb_id ?? null,
    wikidataId: e.wikidata_id ?? null,
    facebookId: e.facebook_id ?? null,
    instagramId: e.instagram_id ?? null,
    twitterId: e.twitter_id ?? null,
  }));

const showEmptyExternalIds = showExternalIds.parse({});

const SHOW_STATUSES = [
  "Returning Series",
  "Planned",
  "In Production",
  "Ended",
  "Canceled",
  "Pilot",
  "Unknown",
] as const;

export const showDetailsSchema = z
  .object({
    id: movieId,
    name: z.string(),
    original_name: text,
    original_language: text,
    tagline: text,
    overview: text,
    status: z.enum(SHOW_STATUSES).catch("Unknown"),
    type: text,
    first_air_date: calendarDate,
    last_air_date: calendarDate,
    in_production: z.boolean().nullish(),
    number_of_seasons: countOrZero,
    number_of_episodes: countOrZero,
    episode_run_time: z.array(z.number()).nullish(),
    adult: z.boolean().nullish(),
    vote_average: countOrZero,
    vote_count: countOrZero,
    popularity: countOrZero,
    poster_path: text,
    backdrop_path: text,
    homepage: text,
    genres: lenientList(genre),
    created_by: lenientList(showCreator),
    networks: lenientList(company),
    production_companies: lenientList(company),
    production_countries: lenientList(country),
    spoken_languages: lenientList(language),
    origin_country: originCountries,
    seasons: lenientList(seasonSummary),
    next_episode_to_air: episodeSchema.nullish().catch(null),
    last_episode_to_air: episodeSchema.nullish().catch(null),
    aggregate_credits: z
      .object({
        cast: lenientList(showCastMember),
        crew: lenientList(showCrewMember),
      })
      .nullish(),
    images: z
      .object({
        backdrops: lenientList(imageSchema),
        posters: lenientList(imageSchema),
        logos: lenientList(imageSchema),
      })
      .nullish(),
    videos: z.object({ results: lenientList(video) }).nullish(),
    content_ratings: z
      .object({ results: lenientList(contentRating) })
      .nullish(),
    recommendations: z
      .object({ results: lenientList(showSummarySchema) })
      .nullish(),
    "watch/providers": z.object({ results: providersByRegion }).nullish(),
    external_ids: showExternalIds.nullish(),
    keywords: z.object({ results: lenientList(genre) }).nullish(),
  })
  .transform((m) => {
    const runtimes = (m.episode_run_time ?? []).filter((n) => n > 0);
    return {
      id: m.id,
      title: m.name,
      originalTitle: m.original_name,
      originalLanguage: m.original_language,
      tagline: m.tagline,
      overview: m.overview,
      status: m.status,
      type: m.type,
      releaseDate: m.first_air_date,
      releaseYear: yearOf(m.first_air_date),
      lastAirDate: m.last_air_date,
      endYear: yearOf(m.last_air_date),
      inProduction: m.in_production ?? false,
      seasonsCount: m.number_of_seasons,
      episodesCount: m.number_of_episodes,
      runtimeMinutes:
        runtimes.length > 0
          ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length)
          : (m.last_episode_to_air?.runtimeMinutes ?? null),
      adult: m.adult ?? false,
      voteAverage: m.vote_average,
      voteCount: m.vote_count,
      popularity: m.popularity,
      posterPath: m.poster_path,
      backdropPath: m.backdrop_path,
      homepage: m.homepage,
      imdbId: m.external_ids?.imdbId ?? null,
      genres: m.genres,
      creators: m.created_by,
      networks: m.networks,
      productionCompanies: m.production_companies,
      productionCountries: m.production_countries,
      spokenLanguages: m.spoken_languages,
      originCountries: m.origin_country,
      seasons: m.seasons,
      nextEpisode: m.next_episode_to_air ?? null,
      lastEpisode: m.last_episode_to_air ?? null,
      credits: m.aggregate_credits ?? { cast: [], crew: [] },
      images: m.images ?? { backdrops: [], posters: [], logos: [] },
      videos: m.videos?.results ?? [],
      contentRatings: m.content_ratings?.results ?? [],
      recommendations: m.recommendations?.results ?? [],
      watchProviders: m["watch/providers"]?.results ?? {},
      externalIds: m.external_ids ?? showEmptyExternalIds,
      keywords: m.keywords?.results ?? [],
    };
  });

export const seasonDetailsSchema = z
  .object({
    id: z.number().int().positive(),
    season_number: z.number().int().nonnegative(),
    name: text,
    overview: text,
    air_date: calendarDate,
    poster_path: text,
    vote_average: countOrZero,
    episodes: lenientList(episodeSchema),
  })
  .transform((s) => ({
    id: s.id,
    seasonNumber: s.season_number,
    name: s.name,
    overview: s.overview,
    airDate: s.air_date,
    year: yearOf(s.air_date),
    posterPath: s.poster_path,
    voteAverage: s.vote_average,
    episodes: s.episodes,
  }));
