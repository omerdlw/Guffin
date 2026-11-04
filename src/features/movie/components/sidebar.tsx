import { Suspense, type JSX } from "react";
import { personHref } from "@/config/routes";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import {
  formatMoney,
  formatReleaseDate,
  getCertification,
  getDirectors,
  getOriginalLanguageName,
  getTags,
  getWriters,
} from "../utils";
import {
  DetailSidebar,
  FactNames,
  FactText,
  type Fact,
  type FactName,
} from "@/features/detail";
import { MoviePoster } from "./artwork";
import { MovieSocialProof } from "@/features/social";
import { MovieAwardsAction } from "./awards";
import { MovieCollectionActions } from "./collection-actions";
import { MoneyCount } from "./money-count";

const MAX_VISIBLE_PEOPLE = 2;
const MAX_VISIBLE_GENRES = 3;
const MAX_VISIBLE_TAGS = 2;

const asName = (person: { id: number; name: string }): FactName => ({
  href: personHref(person.id),
  text: person.name,
});

const capitalize = (text: string) =>
  text.replace(
    /(^|\s)(\S)/g,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
  );

export function MovieSidebar({
  awards,
  movie,
}: {
  awards: Promise<Awards | null>;
  movie: MovieDetails;
}): JSX.Element {
  const directors = getDirectors(movie);
  const writers = getWriters(movie);
  const certification = getCertification(movie);
  const language = getOriginalLanguageName(movie);
  const released = formatReleaseDate(movie.releaseDate);
  const budget = formatMoney(movie.budget);
  const revenue = formatMoney(movie.revenue);
  const tags = getTags(movie);
  const genres = movie.genres.map((genre) => genre.name);

  const facts: Fact[] = [];
  if (genres.length > 0) {
    facts.push({
      label: genres.length > 1 ? "Genres" : "Genre",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_GENRES}
          names={genres.map((text) => ({ text }))}
          index={index}
        />
      ),
    });
  }
  if (tags.length > 0) {
    facts.push({
      label: "Tags",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_TAGS}
          names={tags.map((tag) => ({ text: capitalize(tag) }))}
          index={index}
        />
      ),
    });
  }
  if (directors.length > 0) {
    facts.push({
      label: directors.length > 1 ? "Directors" : "Director",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_PEOPLE}
          names={directors.map(asName)}
          index={index}
        />
      ),
    });
  }
  if (writers.length > 0) {
    facts.push({
      label: writers.length > 1 ? "Writers" : "Writer",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_PEOPLE}
          names={writers.map(asName)}
          index={index}
        />
      ),
    });
  }
  if (released) {
    facts.push({
      label: "Released",
      value: (index) => <FactText index={index}>{released}</FactText>,
    });
  }
  if (certification) {
    facts.push({
      label: "Rated",
      value: (index) => <FactText index={index}>{certification}</FactText>,
    });
  }
  if (language) {
    facts.push({
      label: "Language",
      value: (index) => <FactText index={index}>{language}</FactText>,
    });
  }
  if (movie.status !== "Unknown") {
    facts.push({
      label: "Status",
      value: (index) => <FactText index={index}>{movie.status}</FactText>,
    });
  }
  if (budget) {
    facts.push({
      label: "Budget",
      value: (index) => <MoneyCount index={index} value={movie.budget ?? 0} />,
    });
  }
  if (revenue) {
    facts.push({
      label: "Revenue",
      value: (index) => <MoneyCount index={index} value={movie.revenue ?? 0} />,
    });
  }

  return (
    <DetailSidebar facts={facts}>
      <MoviePoster awards={awards} movie={movie} />
      <MovieCollectionActions movieId={movie.id}>
        <Suspense fallback={null}>
          <MovieAwardsAction awards={awards} />
        </Suspense>
      </MovieCollectionActions>
      <MovieSocialProof movieId={movie.id} title={movie.title} />
    </DetailSidebar>
  );
}
