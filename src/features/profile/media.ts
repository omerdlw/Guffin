import { TMDB_IMAGE_BASE_URL } from "@/infrastructure/tmdb/shared";

export function profileBackdrop(url: string | null | undefined): string | null {
  const value = url?.trim() ?? "";
  return /^(https?:\/\/|\/|data:image\/)/.test(value) ? value : null;
}

export function profileSwatch(backdrop: string | null): string | null {
  if (!backdrop?.startsWith(`${TMDB_IMAGE_BASE_URL}/`)) return backdrop;
  return backdrop.replace(/^(.*\/t\/p\/)[^/]+\//, "$1w300/");
}

export const HERO_SIZES =
  "[--avatar:7rem] [--hero:20rem] sm:[--avatar:9rem] sm:[--hero:24rem] lg:[--hero:clamp(28rem,40vw,36rem)]";
