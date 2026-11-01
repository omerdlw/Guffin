import type { JSX } from "react";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import { PERSON_KNOWN_FOR } from "../constants";
import { SIDEBAR_FACTS_CLASS } from "../styles";
import { SCENE } from "../motion";
import { Sequence } from "@/motion/stage";
import { getFilmography } from "../credits";
import { calculateAge, formatDate } from "../profile";
import { PersonViewActions } from "./view-actions";
import { PersonPortrait } from "./artwork";
import { PersonFacts } from "./facts";
import { SIDEBAR_CLASS } from "@/ui";

export function PersonSidebar({
  awards,
  person,
}: {
  awards?: Promise<Awards | null>;
  person: PersonDetails;
}): JSX.Element {
  const knownFor = (getFilmography(person)[0]?.credits ?? [])
    .slice(0, PERSON_KNOWN_FOR)
    .map(({ id, title }) => ({ id, title }));

  return (
    <Sequence className={SIDEBAR_CLASS} wave={SCENE.buttons.at}>
      <div className="flex min-w-0 flex-col gap-3" data-exit="">
        <PersonPortrait awards={awards} person={person} />
        <PersonViewActions />
      </div>

      <div className={SIDEBAR_FACTS_CLASS} data-flow="">
        <PersonFacts
          age={calculateAge(person.birthday, person.deathday)}
          aliases={person.alsoKnownAs}
          born={formatDate(person.birthday)}
          died={formatDate(person.deathday)}
          knownFor={knownFor}
          place={person.placeOfBirth}
        />
      </div>
    </Sequence>
  );
}
