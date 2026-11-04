import { type JSX, Suspense } from "react";
import {
  DetailAwards,
  DetailLayout,
  DetailSidebar,
  FactNames,
  FactText,
} from "@/features/detail/layout";
import type { Fact } from "@/features/detail/types";
import { movieHref } from "@/lib/project";
import {
  type Awards,
  type PersonDetails,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { PersonCareer, PersonTimeline } from "./career";
import {
  CAREER_MIN_FILMS,
  PERSON_ALIAS_VISIBLE,
  PERSON_KNOWN_FOR,
} from "./constants";
import {
  getBackdropPath,
  getBackdropPaths,
  getCareer,
  getFilmography,
  getGalleryImages,
  getTimeline,
} from "./credits";
import {
  AgeCount,
  PersonBackdropHero,
  PersonHeader,
  PersonPortrait,
  PersonProjection,
  PersonStage,
} from "./header";
import {
  PersonFilmography,
  PersonGallery,
  PersonGalleryWall,
  PersonViewActions,
  PersonViews,
} from "./sections";
import {
  calculateAge,
  departmentRole,
  excerptBiography,
  formatDate,
  getSocialLinks,
} from "./utils";

function PersonSidebar({
  awards,
  person,
}: {
  awards?: Promise<Awards | null>;
  person: PersonDetails;
}): JSX.Element {
  const knownFor = (getFilmography(person)[0]?.credits ?? []).slice(
    0,
    PERSON_KNOWN_FOR,
  );
  const age = calculateAge(person.birthday, person.deathday);
  const born = formatDate(person.birthday);
  const died = formatDate(person.deathday);
  const place = person.placeOfBirth;
  const aliases = person.alsoKnownAs;

  const facts: Fact[] = [];
  if (born) {
    facts.push({
      label: "Born",
      value: (index) => <FactText index={index}>{born}</FactText>,
    });
  }
  if (died) {
    facts.push({
      label: "Died",
      value: (index) => <FactText index={index}>{died}</FactText>,
    });
  }
  if (age !== null) {
    facts.push({
      label: died ? "Aged" : "Age",
      value: (index) => <AgeCount index={index} value={age} />,
    });
  }
  if (place) {
    facts.push({
      label: "Birthplace",
      value: (index) => <FactText index={index}>{place}</FactText>,
    });
  }
  if (aliases.length > 0) {
    facts.push({
      label: "Also known as",
      value: (index) => (
        <FactNames
          index={index}
          max={PERSON_ALIAS_VISIBLE}
          names={aliases.map((text) => ({ text }))}
        />
      ),
    });
  }
  if (knownFor.length > 0) {
    facts.push({
      label: "Known for",
      value: (index) => (
        <FactNames
          index={index}
          max={PERSON_KNOWN_FOR}
          names={knownFor.map((film) => ({
            href: movieHref(film.id),
            text: film.title,
          }))}
        />
      ),
    });
  }

  return (
    <DetailSidebar facts={facts}>
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
  const career = getCareer(person);
  const bio = person.biography ? excerptBiography(person.biography) : null;
  const films = career?.years.reduce((sum, year) => sum + year.count, 0) ?? 0;

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
                  {career && films >= CAREER_MIN_FILMS ? (
                    <PersonCareer career={career} />
                  ) : null}
                  {filmography.length > 0 ? (
                    <PersonFilmography groups={filmography} />
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
