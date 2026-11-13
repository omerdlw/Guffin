import { type JSX, Suspense } from "react";
import type { Fact } from "@/features/detail/detail";
import {
  DetailAwards,
  DetailLayout,
  DetailSidebar,
  namesFact,
  textFact,
} from "@/features/detail/layout";
import { mediaHref } from "@/lib/project";
import {
  type Awards,
  type PersonDetails,
  type PersonExternalIds,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { PersonCareer, PersonTimeline } from "./career";
import {
  getBackdropPath,
  getBackdropPaths,
  getCareer,
  getFilmography,
  getGalleryImages,
  getTimeline,
} from "./credits";
import { PersonFilmography } from "./filmography";
import { PersonGallery, PersonGalleryWall } from "./gallery";
import {
  AgeCount,
  PersonBackdropHero,
  PersonHeader,
  PersonPortrait,
  PersonProjection,
  PersonStage,
} from "./header";
import {
  type ByMedium,
  type Career,
  departmentRole,
  type SocialLink,
} from "./person";
import { PersonViewActions, PersonViews } from "./views";

const PERSON_BIO_CLAMP_LENGTH = 300;

const PERSON_BIO_EXCERPT = 360;

const PERSON_ALIAS_VISIBLE = 2;

const PERSON_KNOWN_FOR = 2;

const PERSON_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

const SOCIAL_SOURCES: readonly {
  icon: string;
  id: (ids: PersonExternalIds) => string | null;
  key: string;
  label: string;
  pattern: RegExp;
  url: (id: string) => string;
}[] = [
  {
    icon: "cib:imdb",
    id: (ids) => ids.imdbId,
    key: "imdb",
    label: "IMDb",
    pattern: /^nm\d+$/,
    url: (id) => `https://www.imdb.com/name/${id}/`,
  },
  {
    icon: "mdi:instagram",
    id: (ids) => ids.instagramId,
    key: "instagram",
    label: "Instagram",
    pattern: /^[A-Za-z0-9._]{1,30}$/,
    url: (id) => `https://www.instagram.com/${id}/`,
  },
  {
    icon: "mdi:twitter",
    id: (ids) => ids.twitterId,
    key: "twitter",
    label: "Twitter",
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    url: (id) => `https://twitter.com/${id}`,
  },
  {
    icon: "mdi:facebook",
    id: (ids) => ids.facebookId,
    key: "facebook",
    label: "Facebook",
    pattern: /^[A-Za-z0-9.]{1,50}$/,
    url: (id) => `https://www.facebook.com/${id}`,
  },
  {
    icon: "ic:baseline-tiktok",
    id: (ids) => ids.tiktokId,
    key: "tiktok",
    label: "TikTok",
    pattern: /^[A-Za-z0-9._]{1,24}$/,
    url: (id) => `https://www.tiktok.com/@${id}`,
  },
  {
    icon: "mdi:youtube",
    id: (ids) => ids.youtubeId,
    key: "youtube",
    label: "YouTube",
    pattern: /^[A-Za-z0-9._-]{1,100}$/,
    url: (id) => `https://www.youtube.com/@${id}`,
  },
  {
    icon: "simple-icons:wikidata",
    id: (ids) => ids.wikidataId,
    key: "wikidata",
    label: "Wikidata",
    pattern: /^Q\d+$/,
    url: (id) => `https://www.wikidata.org/wiki/${id}`,
  },
];

const CAREER_MIN_FILMS = 3;

function parseDay(date: string | null): Date | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date: string | null): string | null {
  const parsed = parseDay(date);
  return parsed ? PERSON_DATE_FORMAT.format(parsed) : null;
}

function calculateAge(
  birthday: string | null,
  deathday: string | null,
  now: Date = new Date(),
): number | null {
  const birth = parseDay(birthday);
  if (!birth) return null;
  const end = parseDay(deathday) ?? now;

  let age = end.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    end.getUTCMonth() < birth.getUTCMonth() ||
    (end.getUTCMonth() === birth.getUTCMonth() &&
      end.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function getSocialLinks(ids: PersonExternalIds): SocialLink[] {
  return SOCIAL_SOURCES.flatMap((source) => {
    const id = source.id(ids);
    if (!id || !source.pattern.test(id)) return [];
    return [
      {
        icon: source.icon,
        key: source.key,
        label: source.label,
        url: source.url(id),
      },
    ];
  });
}

function excerptBiography(
  biography: string,
  limit = PERSON_BIO_EXCERPT,
): { text: string; truncated: boolean } {
  const whole = biography.trim();
  if (whole.length <= PERSON_BIO_CLAMP_LENGTH)
    return { text: whole, truncated: false };

  const paragraph = whole.split(/\n{2,}/)[0].trim();
  const base = paragraph.length >= limit / 2 ? paragraph : whole;
  if (base.length <= limit) {
    return { text: base, truncated: base.length < whole.length };
  }

  const cut = base.slice(0, limit);
  const ends = [...cut.matchAll(/[.!?]["')\]]?(?=\s)/g)];
  const last = ends[ends.length - 1];
  if (last && last.index + last[0].length >= limit / 2) {
    return { text: cut.slice(0, last.index + last[0].length), truncated: true };
  }
  const space = cut.lastIndexOf(" ");
  return {
    text: `${cut.slice(0, space > 0 ? space : limit).replace(/[\s,;:.\-–—]+$/, "")}…`,
    truncated: true,
  };
}

function chartable(careers: ByMedium<Career | null>): ByMedium<Career | null> {
  const enough = (career: Career | null) =>
    career &&
    career.years.reduce((sum, year) => sum + year.count, 0) >= CAREER_MIN_FILMS
      ? career
      : null;
  return { movie: enough(careers.movie), tv: enough(careers.tv) };
}

function PersonSidebar({
  awards,
  person,
}: {
  awards?: Promise<Awards | null>;
  person: PersonDetails;
}): JSX.Element {
  const filmography = getFilmography(person);
  const knownFor = (
    filmography.movie[0]?.credits ??
    filmography.tv[0]?.credits ??
    []
  ).slice(0, PERSON_KNOWN_FOR);
  const age = calculateAge(person.birthday, person.deathday);
  const born = formatDate(person.birthday);
  const died = formatDate(person.deathday);
  const place = person.placeOfBirth;
  const aliases = person.alsoKnownAs;

  const facts: (Fact | false | null | "")[] = [
    born && textFact("Born", born),
    died && textFact("Died", died),
    age !== null && {
      label: died ? "Aged" : "Age",
      value: (index) => <AgeCount index={index} value={age} />,
    },
    place && textFact("Birthplace", place),
    aliases.length > 0 &&
      namesFact(
        "Also known as",
        PERSON_ALIAS_VISIBLE,
        aliases.map((text) => ({ text })),
      ),
    knownFor.length > 0 &&
      namesFact(
        "Known for",
        PERSON_KNOWN_FOR,
        knownFor.map((film) => ({
          href: mediaHref(film.mediaType, film.id),
          text: film.title,
        })),
      ),
  ];

  return (
    <DetailSidebar facts={facts.filter((fact): fact is Fact => Boolean(fact))}>
      <PersonPortrait awards={awards} person={person} />
      <PersonViewActions />
    </DetailSidebar>
  );
}

export function PersonView({
  awards,
  person,
}: {
  awards: Promise<Awards | null>;
  person: PersonDetails;
}): JSX.Element {
  const backdropPath = getBackdropPath(person);
  const backdrop = tmdbImageUrl("backdrop", backdropPath, "original");
  const backdrops = getBackdropPaths(person);
  const portraits = getGalleryImages(person);
  const filmography = getFilmography(person);
  const bio = person.biography ? excerptBiography(person.biography) : null;
  const careers = chartable(getCareer(person));

  return (
    <PersonStage backdrop={backdropPath} person={person}>
      <DetailLayout
        backdrop={
          backdrop ? (
            <PersonBackdropHero fallback={backdropPath} person={person} />
          ) : null
        }
        className="person-page"
        header={
          <PersonHeader
            biography={person.biography}
            excerpt={bio?.text ?? null}
            links={getSocialLinks(person.externalIds)}
            name={person.name}
            role={departmentRole(person.knownForDepartment)}
            truncated={bio?.truncated ?? false}
          />
        }
        intermission={
          <PersonProjection backdrop={backdropPath} person={person} />
        }
        main={
          <PersonViews
            views={{
              main: (
                <>
                  {careers.movie || careers.tv ? (
                    <PersonCareer careers={careers} />
                  ) : null}
                  {filmography.movie.length > 0 || filmography.tv.length > 0 ? (
                    <PersonFilmography filmography={filmography} now />
                  ) : null}
                  <PersonGallery
                    backdrops={backdrops}
                    name={person.name}
                    portraits={portraits}
                  />
                </>
              ),
              timeline: <PersonTimeline years={getTimeline(person)} />,
              awards: (
                <Suspense fallback={null}>
                  <DetailAwards
                    awards={awards}
                    groupings={["organizations", "projects", "timeline"]}
                  />
                </Suspense>
              ),
            }}
          />
        }
        sidebar={<PersonSidebar awards={awards} person={person} />}
        wall={
          <PersonGalleryWall
            backdrops={backdrops}
            name={person.name}
            portraits={portraits}
          />
        }
      />
    </PersonStage>
  );
}
