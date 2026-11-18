import { timingSafeEqual } from "node:crypto";
import { report, trimToNull } from "@omerdlw/base-framework/utils";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { admin } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = trimToNull(process.env.CRON_SECRET);
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { call, db } = admin();
    const notifications = await db.execute<{ removed: number }>(
      sql`select private.prune_notifications() as removed`,
    );
    const account = await call("prune_account_data");
    return NextResponse.json({
      account,
      notifications: notifications.rows[0]?.removed ?? 0,
    });
  } catch (error) {
    report("Scheduled prune", error);
    return NextResponse.json({ error: "Prune failed" }, { status: 500 });
  }
}
