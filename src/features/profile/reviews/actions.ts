"use server";
import "server-only";

import { loadProfile } from "../server";
import {
  REVIEW_KINDS,
  REVIEW_SORTS,
  type ReviewKind,
  type ReviewSort,
  type ReviewsPage,
} from "./reviews";
import { getReviewsPage } from "./server";

export async function loadReviewsPage({
  kind,
  offset,
  sort,
  username,
}: {
  kind: ReviewKind;
  offset: number;
  sort: ReviewSort;
  username: string;
}): Promise<ReviewsPage> {
  const { account, session, viewerId } = await loadProfile(username);
  return getReviewsPage({
    accountId: account.id,
    kind: kind in REVIEW_KINDS ? kind : "all",
    offset: Math.max(0, Math.floor(offset) || 0),
    session,
    sort: sort in REVIEW_SORTS ? sort : "newest",
    viewerId,
  });
}
