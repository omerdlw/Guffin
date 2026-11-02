import { Suspense, type JSX, type ReactNode } from "react";
import { personHref } from "@/config/routes";
import { FACT_ROW_TYPE, FactLink, SIDEBAR_CLASS, TONE, Tooltip } from "@/ui";
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
import { SIDEBAR_FACTS_CLASS } from "../styles";
import { MovieExpose, MoviePart } from "../motion";
import { MoviePoster } from "./artwork";
import { MovieSocialProof } from "@/features/social";
import { MovieAwardsAction } from "./awards";
import { MovieCollectionActions } from "./collection-actions";
import { MoneyCount } from "./money-count";
import { MovieStats } from "./stats";
import type { FilmStats } from "../types";

const MAX_VISIBLE_PEOPLE = 2;
const MAX_VISIBLE_GENRES = 3;
const MAX_VISIBLE_TAGS = 2;

// A fact is one row: its label, its value and the rule under it are three
// parts at the row's place, so the rows come in one after another.
function Row({
  children,
  index,
  label,
}: {
  children: ReactNode;
  index: number;
  label: string;
}) {
  return (
    <div className="group/row relative flex py-3 first:pt-0 last:pb-0 sm:max-lg:grow-2 sm:max-lg:items-center sm:max-lg:first:grow sm:max-lg:first:items-start sm:max-lg:last:grow sm:max-lg:last:items-end">
      <div className="flex w-full items-baseline justify-between gap-6">
        <dt className={`shrink-0 ${TONE.label} text-ink-muted`}>
          <MovieExpose hover index={index} part="label" text={label} />
        </dt>
        <dd
          className={`min-w-0 text-right ${FACT_ROW_TYPE} font-medium text-ink tabular-nums`}
        >
          {children}
        </dd>
      </div>
      <MoviePart
        className={`absolute inset-x-0 bottom-0 h-px ${TONE.rule} group-last/row:hidden`}
        index={index}
        name="line"
      />
    </div>
  );
}

interface Name {
  href?: string;
  text: string;
}

function Names({
  index,
  max,
  names,
}: {
  index: number;
  max: number;
  names: readonly Name[];
}) {
  const visible = names.slice(0, max);
  const hidden = names.slice(max);
  return (
    <>
      {visible.map((name, at) => {
        const text = (
          <MovieExpose hover index={index} part="value" text={name.text} />
        );
        return (
          <span key={`${name.text}-${at}`}>
            {name.href ? (
              // The link's underline is drawn by the link, not the text, so
              // the link comes in with the name.
              <MoviePart as="span" index={index} name="value">
                <FactLink href={name.href} label={name.text}>
                  {text}
                </FactLink>
              </MoviePart>
            ) : (
              text
            )}
            {at < visible.length - 1 ? (
              <MoviePart as="span" index={index} name="value">
                {", "}
              </MoviePart>
            ) : null}
          </span>
        );
      })}
      {hidden.length > 0 ? (
        <Tooltip
          position="top"
          text={hidden.map((name) => name.text).join(", ")}
        >
          <span className="ml-1.5 inline-block cursor-help">
            <MoviePart
              as="span"
              className="inline-block type-meta font-bold text-ink-body"
              index={index}
              name="value"
            >
              +{hidden.length}
            </MoviePart>
          </span>
        </Tooltip>
      ) : null}
    </>
  );
}

function Text({ children, index }: { children: string; index: number }) {
  return <MovieExpose hover index={index} part="value" text={children} />;
}

const asName = (person: { id: number; name: string }): Name => ({
  href: personHref(person.id),
  text: person.name,
});

const capitalize = (text: string) =>
  text.replace(
    /(^|\s)(\S)/g,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
  );

interface Fact {
  label: string;
  value: (index: number) => ReactNode;
}

export function MovieSidebar({
  awards,
  movie,
  stats,
}: {
  awards: Promise<Awards | null>;
  movie: MovieDetails;
  stats: FilmStats | null;
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
        <Names
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
        <Names
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
        <Names
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
        <Names
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
      value: (index) => <Text index={index}>{released}</Text>,
    });
  }
  if (certification) {
    facts.push({
      label: "Rated",
      value: (index) => <Text index={index}>{certification}</Text>,
    });
  }
  if (language) {
    facts.push({
      label: "Language",
      value: (index) => <Text index={index}>{language}</Text>,
    });
  }
  if (movie.status !== "Unknown") {
    facts.push({
      label: "Status",
      value: (index) => <Text index={index}>{movie.status}</Text>,
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
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">
        <MoviePoster awards={awards} movie={movie} />
        <MovieStats stats={stats} />
        <MovieCollectionActions movieId={movie.id}>
          <Suspense fallback={null}>
            <MovieAwardsAction awards={awards} />
          </Suspense>
        </MovieCollectionActions>
        <MovieSocialProof movieId={movie.id} title={movie.title} />
      </div>

      <div className={SIDEBAR_FACTS_CLASS}>
        <dl className="flex flex-col sm:max-lg:flex-1">
          {facts.map((fact, index) => (
            <Row index={index} key={fact.label} label={fact.label}>
              {fact.value(index)}
            </Row>
          ))}
        </dl>
      </div>
    </div>
  );
}
