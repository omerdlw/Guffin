import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getBackdropPath,
  getMedia,
  getTimeline,
  personSwatch,
} from "@/features/person/credits";
import { PersonPageChrome } from "@/features/person/header";
import { describePerson, parsePersonId } from "@/features/person/person";
import { PersonView } from "@/features/person/view";
import { PersonViewProvider } from "@/features/person/views";
import { project, shareMetadata } from "@/lib/project";
import {
  getAmbientPalette,
  getPersonAwards,
  getPersonDetails,
} from "@/lib/tmdb/server";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const id = parsePersonId((await params).id);
  const result = id === null ? null : await getPersonDetails(id);
  if (!result?.success) return { title: `Person · ${project.name}` };

  const person = result.data;
  return shareMetadata({
    description:
      person.biography ??
      (describePerson(person) || `${person.name} on ${project.name}`),
    image: tmdbImageUrl("profile", person.profilePath, "h632"),
    title: person.name,
    type: "profile",
  });
}

export default async function PersonPage({
  params,
}: PersonPageProps): Promise<JSX.Element> {
  const id = parsePersonId((await params).id);
  if (id === null) notFound();

  const result = await getPersonDetails(id);
  if (!result.success) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(`Person ${id} is unavailable (${result.error.kind})`);
  }

  const awards = getPersonAwards(id).then((outcome) =>
    outcome.success ? outcome.data : null,
  );
  const palette = await getAmbientPalette(
    personSwatch(getBackdropPath(result.data), result.data.profilePath),
  );

  return (
    <PersonViewProvider
      awards={awards}
      hasTimeline={getTimeline(result.data).length > 0}
      media={getMedia(result.data)}
      key={id}
    >
      <PersonPageChrome palette={palette} person={result.data} />
      <PersonView awards={awards} person={result.data} />
    </PersonViewProvider>
  );
}
