import type { JSX } from "react";
import { loadProfile } from "@/features/profile/queries";
import {
  ReviewsFilters,
  ReviewsList,
  ReviewsSummary,
} from "@/features/profile/reviews/components/reviews-list";
import {
  REVIEW_KINDS,
  readReviewKind,
  readReviewSort,
} from "@/features/profile/reviews/model";
import {
  getReviewSummary,
  getReviewsPage,
} from "@/features/profile/reviews/queries";
import type { SearchParams } from "@/shared/http";
import { accountHref } from "@/shared/site";

export default async function AccountReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, isOwner, session, viewerId, visible } =
    await loadProfile(username);
  if (!visible) return null;
  const kind = readReviewKind(query);
  const sort = readReviewSort(query);
  const [summary, page] = await Promise.all([
    getReviewSummary({ accountId: account.id, session }),
    getReviewsPage({
      accountId: account.id,
      kind,
      session,
      sort,
      viewerId,
    }),
  ]);

  if (summary.rated + summary.written === 0) {
    return (
      <p className="py-fib-6 text-center type-body text-ink-muted">
        {isOwner
          ? "Rate or review a title from its page and it shows up here"
          : "No reviews yet"}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-fib-5" data-section="reviews">
      <ReviewsSummary summary={summary} />
      <ReviewsFilters
        base={`${accountHref(account.username)}/reviews`}
        kind={kind}
        sort={sort}
      />
      {page.items.length > 0 ? (
        <ReviewsList
          isOwner={isOwner}
          kind={kind}
          page={page}
          signedIn={viewerId !== null}
          sort={sort}
          username={account.username}
        />
      ) : (
        <p className="py-fib-6 text-center type-body text-ink-muted">
          No {REVIEW_KINDS[kind].toLowerCase()} yet
        </p>
      )}
    </section>
  );
}
