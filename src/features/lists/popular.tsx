import type { JSX } from "react";
import { PosterStack } from "@/features/profile/blocks";
import { pluralize } from "@/lib/format";
import { accountHref, listHref } from "@/lib/project";
import { Header } from "@/motion/kit";
import { StagePart, StageSection } from "@/motion/react";
import { Avatar } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { TONE } from "@/design/foundations/tones";
import { COMPACT_COUNT_FORMAT } from "./constants";
import type { PopularList } from "./types";

function PopularListItem({
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
      <DockLink
        aria-label={list.title}
        className="block w-full shrink-0 ui-fade hover:opacity-80 focus-visible:opacity-80 sm:w-60"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </DockLink>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="min-w-0 truncate type-title font-semibold text-ink">
          <DockLink
            className="underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
            href={href}
          >
            {list.title}
          </DockLink>
        </h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 type-control text-ink-muted tabular-nums">
          <DockLink
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
          </DockLink>
          <span>{pluralize(list.itemsCount, "film")}</span>
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
          <PopularListItem index={index} key={list.id} list={list} />
        ))}
      </ul>
    </StageSection>
  );
}
