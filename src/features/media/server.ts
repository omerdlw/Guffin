import "server-only";

import { cookies } from "next/headers";
import type { MediaType } from "@/features/catalog/types";
import { TV_ENABLED, VITRIN_COOKIE_NAME } from "@/lib/env";
import { readParam } from "@/lib/http";
import { VITRIN_PARAM } from "./vitrin";

type SearchParams = Record<string, string | string[] | undefined>;

function readVitrinParam(params: SearchParams | undefined): MediaType | null {
  const value = readParam(params, VITRIN_PARAM);
  return value === "tv" ? "tv" : value === "movie" ? "movie" : null;
}

export async function resolveVitrin(
  params: SearchParams | undefined,
): Promise<MediaType> {
  if (!TV_ENABLED) return "movie";
  const asked = readVitrinParam(params);
  if (asked) return asked;
  const remembered = (await cookies()).get(VITRIN_COOKIE_NAME)?.value;
  return remembered === "tv" ? "tv" : "movie";
}
