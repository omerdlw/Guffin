import { type AwardsApi, createAwardsApi } from "./awards";
import { createDiscoverApi, type DiscoverApi } from "./discover";
import { createMoviesApi, type MoviesApi } from "./movies";
import { createPeopleApi, type PeopleApi } from "./people";
import { createTmdbTransport, type TmdbTransportOptions } from "./transport";
import { createTvApi, type TvApi } from "./tv";

export interface TmdbClient {
  awards: AwardsApi;
  discover: DiscoverApi;
  movies: MoviesApi;
  people: PeopleApi;
  tv: TvApi;
}

export function createTmdbClient(options: TmdbTransportOptions): TmdbClient {
  const transport = createTmdbTransport(options);
  return {
    awards: createAwardsApi(options.onError),
    discover: createDiscoverApi(transport),
    movies: createMoviesApi(transport),
    people: createPeopleApi(transport),
    tv: createTvApi(transport),
  };
}
