import type { Metadata } from "next";
import { TV_ENABLED } from "@/lib/env";

export const project = Object.freeze({
  name: "Guffin",
  description: TV_ENABLED
    ? "Discover movies, shows, cast and crew."
    : "Discover movies, cast and crew.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://guffin.film").replace(
    /\/+$/,
    "",
  ),
});

const DESCRIPTION_LIMIT = 200;

export function shareMetadata({
  card = "summary_large_image",
  description,
  image,
  title,
  type,
}: {
  card?: "summary" | "summary_large_image";
  description: string;
  image: string | null;
  title: string;
  type?: "profile" | "video.movie" | "video.tv_show";
}): Metadata {
  const text =
    description.length <= DESCRIPTION_LIMIT
      ? description
      : `${description.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`;
  return {
    description: text,
    openGraph: {
      description: text,
      images: image ? [{ url: image }] : [],
      title,
      ...(type && { type }),
    },
    title,
    twitter: {
      card: image ? card : "summary",
      description: text,
      images: image ? [image] : [],
      title,
    },
  };
}

export function movieHref(id: number): string {
  return `/movie/${id}`;
}

export function tvHref(id: number): string {
  return `/tv/${id}`;
}

export function seasonHref(showId: number, season: number): string {
  return `${tvHref(showId)}/season/${season}`;
}

export function mediaHref(mediaType: "movie" | "tv", id: number): string {
  return mediaType === "tv" ? tvHref(id) : movieHref(id);
}

export function personHref(id: number): string {
  return `/person/${id}`;
}

export function movieReviewsHref(
  movieId: number,
  { sort, user }: { sort?: string; user?: string } = {},
  mediaType: "movie" | "tv" = "movie",
): string {
  const query = new URLSearchParams();
  if (sort) query.set("sort", sort);
  if (user) query.set("user", user);
  const search = query.toString();
  return `${mediaHref(mediaType, movieId)}/reviews${search ? `?${search}` : ""}`;
}

export function reviewHref(
  movieId: number,
  username: string,
  mediaType: "movie" | "tv" = "movie",
): string {
  return movieReviewsHref(movieId, { user: username }, mediaType);
}

export function accountHref(username: string): string {
  return `/account/${encodeURIComponent(username)}`;
}

export function listHref(username: string, slug: string): string {
  return `${accountHref(username)}/lists/${encodeURIComponent(slug)}`;
}

export const OSCARS_HREF = "/oscars";
export const CANON_HREF = "/top-100";
export const DIRECTORS_HREF = "/directors";
