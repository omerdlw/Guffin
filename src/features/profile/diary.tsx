"use client";

import { type JSX, useMemo } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/modules/dock";
import { useRouter } from "next/navigation";
import { deleteDiaryEntryAction } from "@/features/account/actions";
import { RatingStars } from "@/features/reviews/rating";
import { movieHref, reviewHref } from "@/lib/project";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { DockAction } from "@/design/components/surface";
import { RADIUS } from "@/design/foundations/geometry";
import { useConfirmedAction } from "@/design/hooks/use-confirm";
import { DIARY_COLUMNS, DIARY_HEAD_CLASS } from "./constants";
import { useAccountDock } from "./shell";
import type { DiaryRow } from "./types";
import { dayOf, posterImage } from "./utils";

function Step({
  direction,
  href,
}: {
  direction: "next" | "previous";
  href: string | null;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const className = actionClass({
    className: "w-10 shrink-0 px-0",
  });
  const icon =
    direction === "next"
      ? "solar:alt-arrow-right-linear"
      : "solar:alt-arrow-left-linear";
  const label = direction === "next" ? "Next month" : "Previous month";

  return href ? (
    <DockLink aria-label={label} className={className} href={href}>
      <Icon icon={icon} size={16} />
    </DockLink>
  ) : (
    <span
      aria-disabled="true"
      aria-label={label}
      className={`${className} cursor-default opacity-50`}
      role="link"
    >
      <Icon icon={icon} size={16} />
    </span>
  );
}

function MonthAction({
  label,
  latest,
  next,
  previous,
}: {
  label: string;
  latest: string | null;
  next: string | null;
  previous: string | null;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const middle = actionClass({
    className: "min-w-0 flex-1",
  });

  return (
    <DockAction>
      <div className="flex w-full items-center gap-2.5">
        <Step direction="previous" href={previous} />
        {latest ? (
          <DockLink
            aria-label={`${label}, back to the latest month`}
            className={middle}
            href={latest}
          >
            <span className="truncate">{label}</span>
            <Icon icon="solar:restart-linear" size={14} />
          </DockLink>
        ) : (
          <span className={`${middle} cursor-default`}>
            <span className="truncate">{label}</span>
          </span>
        )}
        <Step direction="next" href={next} />
      </div>
    </DockAction>
  );
}

export function DiaryChrome({
  label,
  latest,
  next,
  previous,
}: {
  label: string;
  latest: string | null;
  next: string | null;
  previous: string | null;
}): null {
  const dock = useMemo(
    () => ({
      action: (
        <MonthAction
          label={label}
          latest={latest}
          next={next}
          previous={previous}
        />
      ),
    }),
    [label, latest, next, previous],
  );
  useAccountDock(dock);
  return null;
}

function DiaryDeleteButton({
  id,
  title,
}: {
  id: string;
  title: string;
}): JSX.Element {
  const router = useRouter();
  const { busy, confirming, confirmThen } = useConfirmedAction({
    fallback: "Could not remove this entry",
    name: "DiaryDeleteButton",
    onSuccess: () => router.refresh(),
  });

  return (
    <Button
      aria-label={
        confirming
          ? `Confirm removing ${title}`
          : `Remove ${title} from the diary`
      }
      icon
      intent={confirming ? "armed" : "ghost"}
      shape="pill"
      size="sm"
      disabled={busy}
      loading={busy}
      onClick={() => confirmThen(() => deleteDiaryEntryAction(id))}
    >
      <Icon
        icon={
          confirming ? "solar:check-read-linear" : "solar:trash-bin-trash-bold"
        }
        size={14}
      />
    </Button>
  );
}

function Mark({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <Icon
      aria-label={label}
      className="text-ink-body"
      icon="solar:check-circle-bold"
      size={16}
    />
  ) : (
    <span aria-hidden="true" className="text-ink-faint">
      —
    </span>
  );
}

export function DiaryLedger({
  isOwner,
  rows,
  username,
}: {
  isOwner: boolean;
  rows: readonly DiaryRow[];
  username: string;
}): JSX.Element {
  return (
    <div className="w-full">
      <div
        className={`${DIARY_COLUMNS} hidden border-b border-line pb-2 sm:grid`}
      >
        <span className={DIARY_HEAD_CLASS}>Day</span>
        <span className={DIARY_HEAD_CLASS}>Film</span>
        <span className={DIARY_HEAD_CLASS}>Rating</span>
        <span className={`${DIARY_HEAD_CLASS} text-center`}>Rewatch</span>
        <span className={`${DIARY_HEAD_CLASS} text-center`}>Review</span>
        <span />
      </div>
      <ul className="divide-y divide-rule">
        {rows.map((row, index) => {
          const same = rows[index - 1]?.watchedOn === row.watchedOn;
          const { day, weekday } = dayOf(row.watchedOn);
          const href = movieHref(row.tmdbId);
          return (
            <li className={`${DIARY_COLUMNS} py-3`} key={row.id}>
              <time className="flex flex-col" dateTime={row.watchedOn}>
                {same ? null : (
                  <>
                    <span className="type-title leading-6 font-semibold text-ink tabular-nums">
                      {day}
                    </span>
                    <span className="type-label text-ink-muted">{weekday}</span>
                  </>
                )}
              </time>

              <div className="flex min-w-0 items-center gap-3">
                <MediaCard
                  aspect="free"
                  className="w-9 shrink-0"
                  fallbackIcon="solar:clapperboard-play-bold"
                  fallbackIconSize={14}
                  frameClassName="h-[3.25rem] w-9"
                  href={href}
                  image={posterImage(row.posterPath, "36px")}
                  label={row.title}
                  radius={RADIUS.thumb}
                />
                <div className="flex min-w-0 flex-col">
                  <DockLink
                    className="truncate type-body font-medium text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
                    href={href}
                  >
                    {row.title}
                  </DockLink>
                  <span className="flex items-center gap-2 type-meta text-ink-muted tabular-nums">
                    {row.year ?? ""}
                    <span className="inline-flex items-center gap-2 sm:hidden">
                      <RatingStars rating={row.rating} size={11} />
                      {row.isRewatch ? (
                        <Icon icon="solar:restart-linear" size={12} />
                      ) : null}
                    </span>
                  </span>
                </div>
              </div>

              <span className="hidden sm:block">
                <RatingStars rating={row.rating} />
              </span>
              <span className="hidden justify-center sm:flex">
                <Mark label="Rewatch" on={row.isRewatch} />
              </span>
              <span className="hidden justify-center sm:flex">
                {row.hasReview ? (
                  <DockLink
                    aria-label="Read the review"
                    className="text-ink-body hover:text-ink focus-visible:text-ink"
                    href={reviewHref(row.tmdbId, username)}
                  >
                    <Icon icon="solar:document-text-bold" size={16} />
                  </DockLink>
                ) : (
                  <Mark label="Review" on={false} />
                )}
              </span>
              <span className="flex justify-end">
                {isOwner ? (
                  <DiaryDeleteButton id={row.id} title={row.title} />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
