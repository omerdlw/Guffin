import { NextResponse } from "next/server";
import { getPublicAccount } from "@/features/account/queries";
import { profileBackdrop, profileSwatch } from "@/features/profile/media";
import { admin } from "@/infrastructure/db/client";
import { apiErrorResponse } from "@/infrastructure/security";

/**
 * The small card shown when an account's name is hovered. It is the same for
 * everyone (no sign-in check, so it is quick); a private account shows only
 * its name, picture and counts, never its bio or banner.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const username = new URL(request.url).searchParams.get("username");
    const session = admin();
    const account = await getPublicAccount({ session, username });
    if (!account) return NextResponse.json(null, { status: 404 });
    const [counts] = await session.call("get_account_follow_counts", {
      p_account_id: account.id,
    });
    const open = !account.isPrivate;
    return NextResponse.json(
      {
        avatarUrl: account.avatarUrl,
        backgroundUrl: open
          ? profileSwatch(profileBackdrop(account.backgroundUrl))
          : null,
        bio: open ? account.bio : null,
        displayName: account.displayName,
        followers: counts?.followers_count ?? 0,
        following: counts?.following_count ?? 0,
        isPrivate: account.isPrivate,
        username: account.username,
      },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
