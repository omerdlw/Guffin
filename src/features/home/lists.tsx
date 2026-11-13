import type { JSX } from "react";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { PosterStack } from "@/features/profile/blocks";
import { listHref } from "@/lib/project";
import { type HomeList, TEXT_LINK_CLASS } from "./feed";
import { formatCompact } from "./format";
import { Heading, HomePart, HomeSection } from "./motion";
import { MemberLink } from "./shelf";

const LIST_LIMIT = 6;

function ListCard({
  index,
  list,
}: {
  index: number;
  list: HomeList;
}): JSX.Element {
  const href = listHref(list.owner.username, list.slug);
  return (
    <HomePart
      as="li"
      className="flex min-w-0 flex-col gap-4"
      index={index}
      name="list"
    >
      <DockLink
        aria-label={list.title}
        className="block ui-fade hover:opacity-80 focus-visible:opacity-80"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </DockLink>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="min-w-0 truncate type-title font-semibold text-ink">
          <DockLink className={TEXT_LINK_CLASS} href={href}>
            {list.title}
          </DockLink>
        </h3>
        {list.description ? (
          <p className="line-clamp-2 type-body text-pretty text-ink-muted">
            {list.description}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center gap-x-4 type-control text-ink-muted tabular-nums">
        <MemberLink member={list.owner} />
        <span className="shrink-0">{list.films} films</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Icon icon="solar:heart-bold" size={13} />
          {formatCompact(list.likes)}
        </span>
      </div>
    </HomePart>
  );
}

export function HomeLists({
  lists,
}: {
  lists: HomeList[];
}): JSX.Element | null {
  if (lists.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="lists">
      <Heading title="Popular lists" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {lists.slice(0, LIST_LIMIT).map((list, index) => (
          <ListCard index={index} key={list.id} list={list} />
        ))}
      </ul>
    </HomeSection>
  );
}
