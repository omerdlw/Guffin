import "server-only";
import type { JSX } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { PosterStack } from "@/features/profile/blocks";
import { accountHref, listHref } from "@/lib/project";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Header } from "@/motion/kit";
import { StagePart, StageSection } from "@/motion/react";
import { AccountLink } from "@/ui/button";
import { Avatar, Icon } from "@/ui/media";
import { TONE } from "@/ui/tokens";
import { COMPACT_COUNT_FORMAT, POPULAR_LISTS_SHOWN } from "./constants";
import type { PopularList, PopularListRow } from "./types";

export async function getMoviePopularLists(
  tmdbId: number,
): Promise<PopularList[]> {
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("lists")
      .select(
        "id, slug, title, description, items_count, likes_count, reviews_count, owner:accounts!lists_account_id_fkey!inner(username, display_name, avatar_url), list_items!inner(tmdb_id)",
      )
      .eq("list_items.tmdb_id", tmdbId)
      .eq("is_private", false)
      .order("likes_count", { ascending: false })
      .order("items_count", { ascending: false })
      .limit(POPULAR_LISTS_SHOWN);
    if (error) throw error;
    const rows = ((data ?? []) as unknown as PopularListRow[]).filter(
      (row) => row.owner?.username,
    );
    if (rows.length === 0) return [];

    const previews = new Map<string, (string | null)[]>();
    const { data: items, error: previewError } = await client.rpc(
      "get_list_previews",
      { p_limit: 5, p_list_ids: rows.map((row) => row.id) },
    );
    if (previewError) throw previewError;
    for (const item of items ?? []) {
      const posters = previews.get(item.list_id) ?? [];
      posters.push(item.poster_path);
      previews.set(item.list_id, posters);
    }

    return rows.map((row) => ({
      description: row.description ?? "",
      id: row.id,
      itemsCount: row.items_count,
      likesCount: row.likes_count,
      owner: {
        avatarUrl: row.owner?.avatar_url ?? null,
        displayName: row.owner?.display_name || row.owner?.username || "",
        username: row.owner?.username ?? "",
      },
      previews: previews.get(row.id) ?? [],
      reviewsCount: row.reviews_count,
      slug: row.slug,
      title: row.title,
    }));
  } catch (error) {
    report("Popular lists read", error);
    return [];
  }
}

function ListRow({
  index,
  list,
}: {
  index: number;
  list: PopularList;
}): JSX.Element {
  const href = listHref(list.owner.username, list.slug);
  return (
    <StagePart
      as="li"
      className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6"
      index={index}
      name="list"
    >
      <AccountLink
        aria-label={list.title}
        className="block w-full shrink-0 ui-fade hover:opacity-80 focus-visible:opacity-80 sm:w-60"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </AccountLink>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="min-w-0 truncate type-title font-semibold text-ink">
          <AccountLink
            className="underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
            href={href}
          >
            {list.title}
          </AccountLink>
        </h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 type-control text-ink-muted tabular-nums">
          <AccountLink
            className="flex min-w-0 items-center gap-2 font-semibold text-ink-body hover:text-ink focus-visible:text-ink"
            href={accountHref(list.owner.username)}
          >
            <Avatar
              className="rounded-full"
              name={list.owner.displayName}
              size={20}
              src={list.owner.avatarUrl ?? undefined}
            />
            <span className="truncate">{list.owner.displayName}</span>
          </AccountLink>
          <span>
            {list.itemsCount.toLocaleString("en-US")}{" "}
            {list.itemsCount === 1 ? "film" : "films"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:heart-bold" size={14} />
            {COMPACT_COUNT_FORMAT.format(list.likesCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:chat-round-bold" size={14} />
            {COMPACT_COUNT_FORMAT.format(list.reviewsCount)}
          </span>
        </div>
        {list.description ? (
          <p className="mt-1 line-clamp-3 max-w-2xl type-copy leading-7 text-ink-body">
            {list.description}
          </p>
        ) : null}
      </div>
    </StagePart>
  );
}

export async function MoviePopularLists({
  lists,
}: {
  lists: Promise<PopularList[]>;
}): Promise<JSX.Element | null> {
  const resolved = await lists;
  if (resolved.length === 0) return null;

  return (
    <StageSection className="flex w-full flex-col" cue="lists">
      <Header
        icon={<Icon icon="solar:widget-bold" size={18} />}
        nameClassName={`min-w-0 ${TONE.label} text-ink-body`}
        part="header"
        title="Popular Lists"
      />
      <ul className={`flex flex-col divide-y ${TONE.rules}`}>
        {resolved.map((list, index) => (
          <ListRow index={index} key={list.id} list={list} />
        ))}
      </ul>
    </StageSection>
  );
}
