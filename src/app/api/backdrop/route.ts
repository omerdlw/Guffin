import { NextResponse } from "next/server";
import { parseMovieId } from "@/features/movie/utils";
import { getBackdropPath } from "@/features/person/credits";
import { parsePersonId } from "@/features/person/utils";
import { parseShowId } from "@/features/tv/utils";
import { TV_ENABLED } from "@/lib/env";
import { getClientIp, rateLimitResponse } from "@/lib/security";
import {
  getMovieDetails,
  getPersonDetails,
  getShowDetails,
} from "@/lib/tmdb/server";

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

async function readableUrl(kind: string, raw: string): Promise<string | null> {
  if (kind === "movie") {
    const id = parseMovieId(raw);
    const result = id === null ? null : await getMovieDetails(id);
    return result?.success ? result.data.backdropPath : null;
  }
  if (kind === "tv") {
    const id = parseShowId(raw);
    const result = id === null ? null : await getShowDetails(id);
    return result?.success ? result.data.backdropPath : null;
  }
  const id = parsePersonId(raw);
  const result = id === null ? null : await getPersonDetails(id);
  return result?.success ? getBackdropPath(result.data) : null;
}

export async function GET(request: Request): Promise<Response> {
  const limited = await rateLimitResponse(
    `picture:${getClientIp(request)}`,
    120,
  );
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id") ?? "";
  if (kind !== "movie" && kind !== "person" && !(kind === "tv" && TV_ENABLED)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  return NextResponse.json(
    { path: await readableUrl(kind, id) },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
