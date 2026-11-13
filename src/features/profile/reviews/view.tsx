import type { JSX } from "react";
import { resolveVitrin } from "@/features/media/server";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { ResultsView } from "@/features/profile/blocks";
import { FilterBar } from "@/features/profile/filter-bar";
import { parseReviewFilters } from "@/features/profile/params";
import {
  type AccountViewProps,
  REVIEW_KINDS,
  REVIEW_SORTS,
} from "@/features/profile/profile";
import { ReviewList } from "./list";
import { getReviewsPage } from "./server";

export async function AccountReviewsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner, viewerId } = context;
  const filters = parseReviewFilters(query);
  const mediaType = await resolveVitrin(query);
  const result = await getReviewsPage({
    accountId: account.id,
    client,
    filters,
    mediaType,
    viewerId,
  });
  const filtered = Boolean(filters.query) || filters.kind !== "all";
  const emptyMessage = filtered
    ? "No reviews match these filters"
    : isOwner
      ? "Your reviews and ratings show up here"
      : "No reviews yet";

  return (
    <ResultsView
      empty={
        result.items.length > 0
          ? null
          : { icon: "solar:pen-new-square-bold", message: emptyMessage }
      }
      paging={result}
      toolbar={
        result.total > 0 || filtered ? (
          <FilterBar
            fields={[
              { defaultValue: "all", key: "kind", options: REVIEW_KINDS },
              { defaultValue: "newest", key: "sort", options: REVIEW_SORTS },
            ]}
            searchPlaceholder="Search reviews"
          />
        ) : null
      }
    >
      <ReviewList
        isOwner={isOwner}
        reviews={result.items}
        signedIn={viewerId !== null}
        username={account.username}
      />
    </ResultsView>
  );
}
