import { report } from "@omerdlw/base-framework/utils";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { admin } from "@/lib/db/client";
import { isCronRequest } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isCronRequest(request)) {
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
