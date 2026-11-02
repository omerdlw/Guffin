import type { JSX } from "react";
import { movieHref } from "@/config/routes";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import {
  DetailSidebar,
  FactNames,
  FactText,
  type Fact,
} from "@/features/detail";
import { PERSON_ALIAS_VISIBLE, PERSON_KNOWN_FOR } from "../constants";
import { getFilmography } from "../credits";
import { calculateAge, formatDate } from "../profile";
import { AgeCount } from "./age-count";
import { PersonPortrait } from "./artwork";
import { PersonViewActions } from "./view-actions";

export function PersonSidebar({
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
