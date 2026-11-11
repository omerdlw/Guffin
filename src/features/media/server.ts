import "server-only";
import { cookies } from "next/headers";
import { TV_ENABLED, VITRIN_COOKIE_NAME } from "@/lib/env";
import type { MediaType } from "./types";
import { readVitrinParam } from "./utils";

type SearchParams = Record<string, string | string[] | undefined>;

export async function resolveVitrin(
  params: SearchParams | undefined,
): Promise<MediaType> {
  if (!TV_ENABLED) return "movie";
  const asked = readVitrinParam(params);
  if (asked) return asked;
  const remembered = (await cookies()).get(VITRIN_COOKIE_NAME)?.value;
  return remembered === "tv" ? "tv" : "movie";
}
