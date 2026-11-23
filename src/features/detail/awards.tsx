"use client";

import { Fragment, type ReactNode, use, useMemo, useState } from "react";
import { Button, Image } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Select } from "@/design/components/select";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { PosterThumb } from "@/features/artwork/artwork";
import { pluralize } from "@/shared/format";
import { movieHref, personHref } from "@/shared/project";
import {
  type AwardRecipient,
  type Awards,
  tmdbImageUrl,
} from "@/infrastructure/tmdb/shared";
import { Foil, type TiltLight } from "@/motion/tilt";
import { CRAFT_ORDER, craftOf, prestigeOf, shortName } from "./award-board";
import type { AwardsGrouping, AwardsLook } from "./detail";
import { DetailPart, detailPart } from "./motion";
import { Trace, TRACE_ROW, useTrace } from "./trace";

interface AwardsFilters {
  grouping: AwardsGrouping;
  organizationId: string;
  winsOnly: boolean;
}

interface AwardItem {
  category: string;
  ceremony: string;
  key: string;
  organizationId: string;
  organizationLogoPath: string | null;
  organizationTitle: string;
  prestige: number;
  posterPath: string | null;
  project: string | null;
  projectId: number | null;
  recipients: AwardRecipient[];
  won: boolean;
  year: string | null;
}

interface AwardGroup {
  items: AwardItem[];
  key: string;
  logoPath: string | null;
  nominations: number;
  title: string;
  wins: number;
}

const GROUPING_LABELS: Record<Exclude<AwardsGrouping, "board">, string> = {
  organizations: "By organization",
  timeline: "Timeline",
};

const MAX_RECIPIENTS = 4;

const ALL_ORGANIZATIONS = "all";

const LABEL_CLASS = TONE.label;

function flattenAwards(awards: Awards): AwardItem[] {
  return awards.organizations.flatMap((organization) =>
    organization.awards.map((award, index) => ({
      category: award.category,
      ceremony: award.ceremony,
      key: `${organization.id}-${index}`,
      organizationId: organization.id,
      organizationLogoPath: organization.logoPath,
      organizationTitle: organization.title,
      prestige: prestigeOf(organization.title),
      posterPath: award.posterPath,
      project: award.project,
      projectId: award.projectId,
      recipients: award.recipients,
      won: award.won,
      year: award.year,
    })),
  );
}

function filterAwards(
  items: readonly AwardItem[],
  {
    organizationId,
    winsOnly,
  }: { organizationId: string | null; winsOnly: boolean },
): AwardItem[] {
  return items.filter(
    (item) =>
      (!winsOnly || item.won) &&
      (!organizationId || item.organizationId === organizationId),
  );
}

const byYearDesc = (a: AwardItem, b: AwardItem) =>
  (b.year ?? "").localeCompare(a.year ?? "") ||
  Number(b.won) - Number(a.won) ||
  a.category.localeCompare(b.category);

function groupAwardItems(
  key: string,
  title: string,
  items: AwardItem[],
  extra: Pick<AwardGroup, "logoPath">,
): AwardGroup {
  return {
    ...extra,
    items: [...items].sort(byYearDesc),
    key,
    nominations: items.filter((item) => !item.won).length,
    title,
    wins: items.filter((item) => item.won).length,
  };
}

function groupAwards(
  items: readonly AwardItem[],
  grouping: "organizations" | "timeline",
): AwardGroup[] {
  const buckets = new Map<string, AwardItem[]>();
  const keyOf = (item: AwardItem) =>
    grouping === "organizations" ? item.organizationId : (item.year ?? "");
  for (const item of items) {
    const key = keyOf(item);
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }

  const groups = [...buckets.entries()].map(([key, bucket]) => {
    const first = bucket[0];
    return grouping === "organizations"
      ? groupAwardItems(key, first.organizationTitle, bucket, {
          logoPath: first.organizationLogoPath,
        })
      : groupAwardItems(key, first.year ?? "Undated", bucket, {
          logoPath: null,
        });
  });

  return groups.sort((a, b) =>
    grouping === "timeline"
      ? (b.items[0].year ?? "").localeCompare(a.items[0].year ?? "")
      : a.items[0].prestige - b.items[0].prestige ||
        b.wins - a.wins ||
        b.items.length - a.items.length,
  );
}

interface BoardCell {
  count: number;
  key: string;
  name: string;
  title: string;
  won: boolean;
}

interface BoardRow {
  cells: BoardCell[];
  items: AwardItem[];
  key: string;
  label: string;
  order: number;
  poster: {
    id: number | null;
    path: string | null;
  } | null;
  wins: number;
}

const byStanding = (a: AwardItem, b: AwardItem) =>
  a.prestige - b.prestige ||
  a.organizationTitle.localeCompare(b.organizationTitle) ||
  Number(b.won) - Number(a.won) ||
  (b.year ?? "").localeCompare(a.year ?? "");

function boardRows(items: readonly AwardItem[], byTitle: boolean): BoardRow[] {
  const rows = new Map<string, BoardRow>();
  for (const item of items) {
    const craft = craftOf(item.category, item.organizationTitle);
    const key = byTitle
      ? item.projectId
        ? `movie-${item.projectId}`
        : (item.project ?? "honors")
      : craft.key;
    const row = rows.get(key) ?? {
      cells: [],
      items: [],
      key,
      label: byTitle ? (item.project ?? "Career and honorary") : craft.label,
      order: byTitle ? 0 : CRAFT_ORDER.indexOf(craft.key),
      poster: byTitle ? { id: item.projectId, path: null } : null,
      wins: 0,
    };
    row.items.push(item);
    if (item.won) row.wins += 1;
    if (row.poster && !row.poster.path) row.poster.path = item.posterPath;
    rows.set(key, row);
  }

  for (const row of rows.values()) {
    row.items.sort(byStanding);
    const cells = new Map<string, BoardCell>();
    for (const item of row.items) {
      const cell = cells.get(item.organizationId) ?? {
        count: 0,
        key: item.organizationId,
        name: shortName(item.organizationTitle),
        title: item.organizationTitle,
        won: false,
      };
      cell.count += 1;
      cell.won ||= item.won;
      cells.set(item.organizationId, cell);
    }
    row.cells = [...cells.values()];
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.items.length - a.items.length ||
      a.order - b.order ||
      a.label.localeCompare(b.label),
  );
}

function wonAcademyAward(awards: Awards): boolean {
  return awards.organizations.some(
    (organization) =>
      /academy award|oscar/i.test(organization.title) &&
      organization.awards.some((award) => award.won),
  );
}

function summarizeAwardGroup({ nominations, wins }: AwardGroup): string {
  return [
    wins > 0 ? pluralize(wins, "win", "wins") : null,
    nominations > 0
      ? pluralize(nominations, "nomination", "nominations")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function countAwardTitles(items: readonly AwardItem[]): number {
  return new Set(
    items.map((item) => item.projectId ?? item.project).filter(Boolean),
  ).size;
}

function InlineLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <DockLink href={href} variant="reveal">
      {children}
    </DockLink>
  );
}

function ProjectName({ id, name }: { id: number | null; name: string }) {
  return id ? (
    <InlineLink href={movieHref(id)}>{name}</InlineLink>
  ) : (
    <>{name}</>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <p className="flex flex-col items-end gap-1">
      <span className="font-zuume type-display-xs leading-none font-bold text-ink tabular-nums">
        {value}
      </span>
      <span className={cn(LABEL_CLASS, "text-ink-muted")}>{label}</span>
    </p>
  );
}

function Summary({ awards }: { awards: Awards }) {
  const total = awards.wins + awards.nominations;
  const organizations = awards.organizations.length;
  const won = awards.wins > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <p className="flex items-end gap-3">
          <span
            className={cn(
              "font-zuume type-display-sm leading-none font-bold tabular-nums sm:type-display-md",
              won ? "text-award" : "text-ink",
            )}
          >
            {won ? awards.wins : total}
          </span>
          <span className={cn(LABEL_CLASS, "pb-1 text-ink-muted")}>
            {won
              ? awards.wins === 1
                ? "win"
                : "wins"
              : total === 1
                ? "nomination"
                : "nominations"}
          </span>
        </p>
        <div className="flex gap-8">
          {won ? (
            <Stat
              label={total === 1 ? "nomination" : "nominations"}
              value={total}
            />
          ) : null}
          <Stat
            label={organizations === 1 ? "organization" : "organizations"}
            value={organizations}
          />
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-fill">
        <span
          className="block h-full rounded-full bg-award"
          style={{ width: `${(awards.wins / Math.max(total, 1)) * 100}%` }}
          {...detailPart("meter")}
        />
      </div>
    </div>
  );
}

function Mark({ won }: { won: boolean }) {
  return won ? (
    <Icon className="shrink-0 text-award" icon="solar:cup-bold" size={14} />
  ) : (
    <span
      aria-hidden="true"
      className="mx-[3px] size-2 shrink-0 rounded-full ring-1 ring-ink-muted ring-inset"
    />
  );
}

function Tag({ cell }: { cell: BoardCell }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 type-meta font-semibold whitespace-nowrap",
        cell.won
          ? "bg-award/12 text-award ring-1 ring-award/30 ring-inset"
          : "text-ink-muted ring-1 ring-edge ring-inset",
      )}
      title={cell.title}
    >
      {cell.won ? <Icon icon="solar:cup-bold" size={11} /> : null}
      {cell.name}
      {cell.count > 1 ? (
        <span className="opacity-60 tabular-nums">×{cell.count}</span>
      ) : null}
      <span className="sr-only">{cell.won ? ", won" : ", nominated"}</span>
    </span>
  );
}

function BoardEntry({
  item,
  showRecipients,
  showTitles,
}: {
  item: AwardItem;
  showRecipients: boolean;
  showTitles: boolean;
}) {
  const parts: ReactNode[] = [item.category];
  if (showTitles && item.project)
    parts.push(<ProjectName id={item.projectId} name={item.project} />);
  if (showRecipients && item.recipients.length > 0)
    parts.push(<Recipients recipients={item.recipients} />);

  return (
    <li className="flex items-start gap-3 py-2">
      <span className="flex h-5 items-center">
        <Mark won={item.won} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-4">
          <span
            className={cn(
              "min-w-0 truncate type-body font-semibold",
              item.won ? "text-ink" : "text-ink-body",
            )}
          >
            {item.organizationTitle}
          </span>
          {item.year ? (
            <span className="shrink-0 type-meta text-ink-muted tabular-nums">
              {item.year}
            </span>
          ) : null}
        </span>
        <span className="type-meta text-ink-muted">
          <Joined parts={parts} />
        </span>
      </span>
    </li>
  );
}

function Joined({ parts }: { parts: ReactNode[] }) {
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? " · " : null}
      {part}
    </Fragment>
  ));
}

function Recipients({ recipients }: { recipients: AwardRecipient[] }) {
  const names = recipients.slice(0, MAX_RECIPIENTS);
  const more = recipients.length - names.length;
  return (
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
    </>
  );
}

function BoardLine({
  index,
  look,
  onToggle,
  open,
  row,
  showRecipients,
  showTitles,
}: {
  index: number;
  look: AwardsLook;
  onToggle: () => void;
  open: boolean;
  row: BoardRow;
  showRecipients: boolean;
  showTitles: boolean;
}) {
  const panel = `award-${row.key}`;

  return (
    <DetailPart
      as="li"
      className="relative border-t border-rule first:border-t-0"
      index={index}
      name="laurel"
    >
      <div {...TRACE_ROW} className="flex flex-col">
        <button
          aria-controls={panel}
          aria-expanded={open}
          className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 rounded-tile px-3 py-3 text-left sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]"
          onClick={onToggle}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            {row.poster?.path ? (
              <PosterThumb
                className={cn("w-8 shrink-0", look.poster)}
                original
                movieId={row.poster.id}
                posterPath={row.poster.path}
              />
            ) : null}
            <span
              className={cn(
                "truncate type-body font-semibold",
                row.wins > 0 ? "text-ink" : "text-ink-body",
              )}
            >
              {row.label}
            </span>
          </span>
          <span className="col-span-2 row-start-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:row-start-1 sm:col-start-2">
            {row.cells.map((cell) => (
              <Tag cell={cell} key={cell.key} />
            ))}
          </span>
          <span className="flex items-center gap-2 type-meta text-ink-muted tabular-nums sm:col-start-3">
            <span>
              <span className={row.wins > 0 ? "text-ink" : undefined}>
                {row.wins}
              </span>
              /{row.items.length}
            </span>
            <span
              className="flex"
              style={{ transform: open ? "rotate(180deg)" : undefined }}
              {...detailPart("turn")}
            >
              <Icon icon="solar:alt-arrow-down-linear" size={14} />
            </span>
          </span>
        </button>
        <div
          className="grid"
          id={panel}
          style={{
            gridTemplateRows: open ? "1fr" : "0fr",
            opacity: open ? 1 : 0,
          }}
          {...detailPart("fold")}
        >
          <div className="min-h-0 overflow-hidden" inert={!open}>
            <ul className="flex flex-col px-3 pb-3 sm:pl-[calc(13rem+--spacing(7))]">
              {row.items.map((item) => (
                <BoardEntry
                  item={item}
                  key={item.key}
                  showRecipients={showRecipients}
                  showTitles={showTitles && !row.poster}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DetailPart>
  );
}

function AwardBoard({
  byTitle,
  items,
  look,
  showRecipients,
  showTitles,
}: {
  byTitle: boolean;
  items: readonly AwardItem[];
  look: AwardsLook;
  showRecipients: boolean;
  showTitles: boolean;
}) {
  const rows = useMemo(() => boardRows(items, byTitle), [items, byTitle]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [list, setList] = useState<HTMLUListElement | null>(null);
  const { trace, props } = useTrace(list);
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <ul className="relative -mx-3 flex flex-col" ref={setList} {...props}>
      <Trace trace={trace} />
      {rows.map((row, index) => (
        <BoardLine
          index={index}
          key={row.key}
          look={look}
          onToggle={() => toggle(row.key)}
          open={open.has(row.key)}
          row={row}
          showRecipients={showRecipients}
          showTitles={showTitles}
        />
      ))}
    </ul>
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
  omit: "organizations" | "timeline";
  showRecipients: boolean;
  showTitles: boolean;
}) {
  const parts: ReactNode[] = [];
  if (showRecipients && item.recipients.length > 0)
    parts.push(<Recipients recipients={item.recipients} />);
  if (showTitles && item.project) {
    parts.push(<ProjectName id={item.projectId} name={item.project} />);
  }
  if (omit !== "organizations") parts.push(item.organizationTitle);
  if (omit !== "timeline" && item.year) parts.push(item.year);

  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="flex h-6 items-center">
        <Mark won={item.won} />
      </span>
      {showTitles && item.posterPath ? (
        <PosterThumb
          className={cn("w-9", look.poster)}
          original
          movieId={item.projectId}
          posterPath={item.posterPath}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
            <Joined parts={parts} />
          </span>
        ) : null}
      </div>
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
  grouping: "organizations" | "timeline";
  look: AwardsLook;
  showRecipients: boolean;
  showTitles: boolean;
}) {
  const logo = tmdbImageUrl("logo", group.logoPath, "original");

  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-3 border-b border-rule pb-3">
        {logo ? (
          <Image
            alt=""
            className="object-contain p-0.5"
            src={logo}
            wrapperClassName={cn("size-7 shrink-0 bg-fill-hover", look.logo)}
          />
        ) : null}
        <h3 className="min-w-0 flex-1 truncate type-body font-bold text-ink">
          {group.title}
        </h3>
        <span className="shrink-0 type-meta text-ink-muted tabular-nums">
          {summarizeAwardGroup(group)}
        </span>
      </header>
      <ul className="flex flex-col">
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
    grouping: groupings[0] ?? "board",
    organizationId: ALL_ORGANIZATIONS,
    winsOnly: false,
  });
  const { grouping, organizationId, winsOnly } = filters;
  const updateFilters = (patch: Partial<AwardsFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const items = useMemo(() => (awards ? flattenAwards(awards) : []), [awards]);
  const shown = useMemo(
    () =>
      filterAwards(items, {
        organizationId:
          organizationId === ALL_ORGANIZATIONS ? null : organizationId,
        winsOnly,
      }),
    [items, organizationId, winsOnly],
  );
  const groups = useMemo(
    () => (grouping === "board" ? [] : groupAwards(shown, grouping)),
    [grouping, shown],
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

  const showTitles = countAwardTitles(items) > 1;
  const label = (key: AwardsGrouping) =>
    key === "board"
      ? showTitles
        ? "By title"
        : "By category"
      : GROUPING_LABELS[key];

  return (
    <div className="flex flex-col gap-8">
      <Summary awards={awards} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        {groupings.length > 1 ? (
          <SegmentedControl
            ariaLabel="Group awards"
            items={groupings.map((key) => ({ key, label: label(key) }))}
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

      <div
        className="flex flex-col gap-10"
        key={`${grouping}:${organizationId}:${winsOnly}`}
      >
        {shown.length === 0 ? (
          <AwardsNotice>Nothing matches these filters</AwardsNotice>
        ) : grouping === "board" ? (
          <AwardBoard
            byTitle={showTitles}
            items={shown}
            look={look}
            showRecipients={showRecipients}
            showTitles={showTitles}
          />
        ) : (
          groups.map((group) => (
            <AwardGroupBlock
              group={group}
              grouping={grouping}
              key={group.key}
              look={look}
              showRecipients={showRecipients}
              showTitles={showTitles}
            />
          ))
        )}
      </div>
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
