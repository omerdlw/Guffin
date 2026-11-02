import { Suspense, type JSX } from "react";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import { DetailAwards, DetailLayout } from "@/features/detail";
import { getCareer, getFilmography, getTimeline } from "./credits";
import { getBackdropPath, getBackdropPaths, getGalleryImages } from "./images";
import { departmentRole, excerptBiography, getSocialLinks } from "./profile";
import { PersonBackdropHero } from "./components/artwork";
import { PersonCareer } from "./components/career";
import { PersonFilmography } from "./components/filmography";
import { PersonGallery, PersonGalleryWall } from "./components/gallery";
import { PersonHeader } from "./components/header";
import { PersonProjection } from "./components/projection";
import { PersonSidebar } from "./components/sidebar";
import { PersonStage } from "./components/stage";
import { PersonTimeline } from "./components/timeline";
import { PersonViews } from "./components/view-switcher";

const CAREER_MIN_FILMS = 3;

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
