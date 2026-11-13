import type { JSX } from "react";
import { resolveVitrin } from "@/features/media/server";
import { mediaNoun } from "@/features/media/vitrin";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { EmptyState, PosterGrid } from "@/features/profile/blocks";
import { Pagination } from "@/features/profile/controls";
import { FilterBar } from "@/features/profile/filter-bar";
import { AccountPart, AccountSection } from "@/features/profile/motion";
import { parseMediaFilters } from "@/features/profile/params";
import {
  type AccountViewProps,
  hasMediaFilters,
  MEDIA_FILTERS,
  MEDIA_SORTS,
  type MediaKind,
} from "@/features/profile/profile";
import type { MediaType } from "@/lib/tmdb/shared";
import { getMediaPage } from "./server";

const MEDIA_VIEW_KINDS: Record<
  MediaKind,
  Record<MediaType, { empty: string; emptyOwn: string; icon: string }>
> = {
  likes: {
    movie: {
      empty: "No liked movies yet",
      emptyOwn:
        "Movies you like show up here. Pin up to five as your favorites.",
      icon: "solar:heart-bold",
    },
    tv: {
      empty: "No liked shows yet",
      emptyOwn:
        "Shows you like show up here. Pin up to five as your favorites.",
      icon: "solar:heart-bold",
    },
  },
  watched: {
    movie: {
      empty: "No watched movies yet",
      emptyOwn: "Movies you mark as watched show up here",
      icon: "solar:eye-bold",
    },
    tv: {
      empty: "No finished shows yet",
      emptyOwn: "Shows you finish show up here",
      icon: "solar:eye-bold",
    },
  },
  watchlist: {
    movie: {
      empty: "The watchlist is empty",
      emptyOwn: "Movies you save for later show up here",
      icon: "solar:bookmark-bold",
    },
    tv: {
      empty: "The watchlist is empty",
      emptyOwn: "Shows you save for later show up here",
      icon: "solar:bookmark-bold",
    },
  },
};

export async function AccountMediaView({
  kind,
  query,
  username,
}: AccountViewProps & { kind: MediaKind }): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const filters = parseMediaFilters(query);
  const mediaType = await resolveVitrin(query);
  const result = await getMediaPage({
    accountId: account.id,
    client,
    filters,
    kind,
    mediaType,
  });
  const copy = MEDIA_VIEW_KINDS[kind][mediaType];
  const filtered = hasMediaFilters(filters);
  const showBar = result.total > 0 || filtered;

  return (
    <AccountSection as="div" className="flex w-full flex-col" cue="shelf" now>
      {showBar ? (
        <AccountPart name="row">
          <FilterBar
            fields={[
              ...MEDIA_FILTERS,
              {
                defaultValue: "added_desc",
                key: "sort",
                options: MEDIA_SORTS,
              },
            ]}
            searchPlaceholder="Search titles"
          />
        </AccountPart>
      ) : null}

      {result.items.length > 0 ? (
        <>
          <PosterGrid
            items={result.items}
            source={isOwner ? { kind, mediaType } : null}
            staged
          />
          <AccountPart name="row">
            <Pagination page={result.page} pageCount={result.pageCount} />
          </AccountPart>
        </>
      ) : (
        <AccountPart name="row">
          <EmptyState icon={copy.icon}>
            {filtered
              ? `No ${mediaNoun(mediaType)} match these filters`
              : isOwner
                ? copy.emptyOwn
                : copy.empty}
          </EmptyState>
        </AccountPart>
      )}
    </AccountSection>
  );
}
