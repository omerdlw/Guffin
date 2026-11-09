"use client";

import { Fragment, type ReactNode, use, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PosterThumb } from "@/features/artwork/artwork";
import { movieHref, personHref } from "@/lib/project";
import { type Awards, tmdbImageUrl } from "@/lib/tmdb/shared";
import { Foil } from "@/motion/tilt";
import type { TiltLight } from "@/motion/types";
import { DockLink } from "@/design/components/link";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { Image } from "@/design/components/image";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Select } from "@/design/components/select";
import { cn } from "@/design/foundations/cn";
import {
  ALL_ORGANIZATIONS,
  AWARD_GROUP_VARIANTS,
  AWARD_LIST_VARIANTS,
  GROUPING_LABELS,
  LABEL_CLASS,
  MAX_RECIPIENTS,
  STILL_VARIANTS,
} from "./constants";
import type {
  AwardGroup,
  AwardItem,
  AwardsFilters,
  AwardsGrouping,
  AwardsLook,
} from "./types";
import {
  buildAwardStats,
  countAwardTitles,
  filterAwards,
  flattenAwards,
  groupAwards,
  summarizeAwardGroup,
  wonAcademyAward,
} from "./utils";

function InlineLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <DockLink href={href} variant="reveal">
      {children}
    </DockLink>
  );
}

function ProjectName({
  id,
  mediaType,
  name,
}: {
  id: number | null;
  mediaType: "movie" | "tv" | null;
  name: string;
}) {
  return id && mediaType === "movie" ? (
    <InlineLink href={movieHref(id)}>{name}</InlineLink>
  ) : (
    <>{name}</>
  );
}

function Stat({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center gap-2 px-2 text-center">
      <dt className={cn(LABEL_CLASS, "-mr-(--tracking-label) text-ink-muted")}>
        {label}
      </dt>
      <dd
        className={cn(
          "font-zuume type-display-sm leading-none font-bold tabular-nums sm:type-display-md",
          strong ? "text-ink" : "text-ink-muted",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Status({ won }: { won: boolean }) {
  return (
    <span
      className={cn(
        LABEL_CLASS,
        "-mr-(--tracking-label) inline-flex shrink-0 items-center gap-1.5 pt-0.5",
        won ? "text-ink" : "text-ink-muted",
      )}
    >
      {won ? <Icon icon="solar:cup-bold" size={13} /> : null}
      {won ? "Winner" : "Nominee"}
    </span>
  );
}

function AwardRow({
  item,
  look,
  omit,
  showRecipients,
  showTitles,
}: {
  item: AwardItem;
  look: AwardsLook;
  omit: AwardsGrouping;
  showRecipients: boolean;
  showTitles: boolean;
}) {
  const parts: ReactNode[] = [];
  if (showRecipients && item.recipients.length > 0) {
    const names = item.recipients.slice(0, MAX_RECIPIENTS);
    const more = item.recipients.length - names.length;
    parts.push(
      <>
        {names.map((recipient, index) => (
          <Fragment key={recipient.id}>
            {index > 0 ? ", " : null}
            <InlineLink href={personHref(recipient.id)}>
              {recipient.name}
            </InlineLink>
          </Fragment>
        ))}
        {more > 0 ? ` +${more}` : null}
      </>,
    );
  }
  if (showTitles && omit !== "projects" && item.project) {
    parts.push(
      <ProjectName
        id={item.projectId}
        mediaType={item.mediaType}
        name={item.project}
      />,
    );
  }
  if (omit !== "organizations") parts.push(item.organizationTitle);
  if (omit !== "timeline" && item.year) parts.push(item.year);

  return (
    <li className="flex items-start gap-4 py-3.5">
      {showTitles && omit !== "projects" && item.posterPath ? (
        <PosterThumb
          className={cn("w-9", look.poster)}
          original
          movieId={item.mediaType === "movie" ? item.projectId : null}
          posterPath={item.posterPath}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn(
            "type-body font-semibold",
            item.won ? "text-ink" : "text-ink-body",
          )}
        >
          {item.category}
        </span>
        {parts.length > 0 ? (
          <span className="type-meta text-ink-muted">
            {parts.map((part, index) => (
              <Fragment key={index}>
                {index > 0 ? " · " : null}
                {part}
              </Fragment>
            ))}
          </span>
        ) : null}
      </div>
      <Status won={item.won} />
    </li>
  );
}

function AwardGroupBlock({
  group,
  grouping,
  look,
  showRecipients,
  showTitles,
}: {
  group: AwardGroup;
  grouping: AwardsGrouping;
  look: AwardsLook;
  showRecipients: boolean;
  showTitles: boolean;
}) {
  const logo = tmdbImageUrl("logo", group.logoPath, "original");

  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-3 border-b border-rule pb-3">
        {grouping === "projects" && group.poster?.path ? (
          <PosterThumb
            className={cn("w-9", look.poster)}
            original
            movieId={
              group.poster.mediaType === "movie" ? group.poster.id : null
            }
            posterPath={group.poster.path}
          />
        ) : null}
        {logo ? (
          <Image
            alt=""
            className="object-contain p-0.5"
            src={logo}
            wrapperClassName={cn("size-7 shrink-0 bg-fill-hover", look.logo)}
          />
        ) : null}
        <h3 className="min-w-0 flex-1 truncate type-body font-bold text-ink">
          {grouping === "projects" && group.poster ? (
            <ProjectName
              id={group.poster.id}
              mediaType={group.poster.mediaType}
              name={group.title}
            />
          ) : (
            group.title
          )}
        </h3>
        <span className="shrink-0 type-meta text-ink-muted tabular-nums">
          {summarizeAwardGroup(group)}
        </span>
      </header>
      <ul className="flex flex-col divide-y divide-rule">
        {group.items.map((item) => (
          <AwardRow
            item={item}
            key={item.key}
            look={look}
            omit={grouping}
            showRecipients={showRecipients}
            showTitles={showTitles}
          />
        ))}
      </ul>
    </section>
  );
}

function AwardsNotice({ children }: { children: string }) {
  return <p className="py-6 type-body text-ink-muted">{children}</p>;
}

export function AwardsView({
  awards,
  groupings,
  look = {},
  showRecipients = false,
}: {
  awards: Awards | null;
  groupings: readonly AwardsGrouping[];
  look?: AwardsLook;
  showRecipients?: boolean;
}) {
  const [filters, setFilters] = useState<AwardsFilters>({
    grouping: groupings[0] ?? "organizations",
    organizationId: ALL_ORGANIZATIONS,
    winsOnly: false,
  });
  const { grouping, organizationId, winsOnly } = filters;
  const updateFilters = (patch: Partial<AwardsFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const reduced = useReducedMotion();

  const items = useMemo(() => (awards ? flattenAwards(awards) : []), [awards]);
  const groups = useMemo(
    () =>
      groupAwards(
        filterAwards(items, {
          organizationId:
            organizationId === ALL_ORGANIZATIONS ? null : organizationId,
          winsOnly,
        }),
        grouping,
      ),
    [grouping, items, organizationId, winsOnly],
  );

  if (!awards) {
    return (
      <AwardsNotice>
        Awards are unavailable right now. Please try again in a moment
      </AwardsNotice>
    );
  }
  if (items.length === 0) {
    return <AwardsNotice>No awards or nominations on record</AwardsNotice>;
  }

  const titleCount = countAwardTitles(items);
  const showTitles = titleCount > 1;
  const stats = buildAwardStats(
    awards,
    groupings.includes("projects") && showTitles ? titleCount : null,
  );

  return (
    <div className="flex flex-col gap-8">
      <dl
        className="grid divide-x divide-rule"
        style={{
          gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
        }}
      >
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        {groupings.length > 1 ? (
          <SegmentedControl
            ariaLabel="Group awards"
            shape={look.shape}
            items={groupings.map((key) => ({
              key,
              label: GROUPING_LABELS[key],
            }))}
            onChange={(next) => updateFilters({ grouping: next })}
            value={grouping}
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
          {awards.organizations.length > 1 ? (
            <Select
              ariaLabel="Organization"
              className="w-48"
              shape={look.shape}
              onChange={(next) => updateFilters({ organizationId: next })}
              options={[
                { label: "All organizations", value: ALL_ORGANIZATIONS },
                ...awards.organizations.map((organization) => ({
                  label: organization.title,
                  value: organization.id,
                })),
              ]}
              size="sm"
              value={organizationId}
            />
          ) : null}
          {awards.wins > 0 ? (
            <Button
              aria-pressed={winsOnly}
              className={cn("px-3 font-semibold", look.button)}
              intent={winsOnly ? "chosen" : "neutral"}
              size="sm"
              onClick={() => updateFilters({ winsOnly: !winsOnly })}
              type="button"
            >
              <Icon icon="solar:cup-bold" size={13} />
              Wins only
            </Button>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate="visible"
          className="flex flex-col gap-10"
          exit="exit"
          initial="hidden"
          key={`${grouping}:${organizationId}:${winsOnly}`}
          variants={reduced ? STILL_VARIANTS : AWARD_LIST_VARIANTS}
        >
          {groups.length === 0 ? (
            <AwardsNotice>Nothing matches these filters</AwardsNotice>
          ) : (
            groups.map((group) => (
              <motion.div
                key={group.key}
                variants={reduced ? STILL_VARIANTS : AWARD_GROUP_VARIANTS}
              >
                <AwardGroupBlock
                  group={group}
                  grouping={grouping}
                  look={look}
                  showRecipients={showRecipients}
                  showTitles={showTitles}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function AwardFoil({
  awards,
  ...light
}: TiltLight & { awards: Promise<Awards | null> }) {
  const known = use(awards);
  return known && wonAcademyAward(known) ? <Foil {...light} /> : null;
}
