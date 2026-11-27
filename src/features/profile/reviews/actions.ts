"use server";
import "server-only";

import { isKeyOf, readOffset } from "@/shared/http";
import { loadProfile } from "../queries";
import {
  REVIEW_KINDS,
  REVIEW_SORTS,
  type ReviewKind,
  type ReviewSort,
  type ReviewsPage,
} from "./model";
import { getReviewsPage } from "./queries";

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
    kind: isKeyOf(REVIEW_KINDS, kind) ? kind : "all",
    offset: readOffset(offset),
    session,
    sort: isKeyOf(REVIEW_SORTS, sort) ? sort : "newest",
    viewerId,
  });
}
