"use client";

import { type JSX, useEffect, useMemo, useState } from "react";
import {
  type SurfaceEntry,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { report } from "@omerdlw/base-framework/utils";
import { useAuth } from "@/features/auth/provider";
import { RatingStars } from "@/features/reviews/rating";
import { accountHref, reviewHref } from "@/lib/project";
import { StagePart } from "@/motion/react";
import {
  Avatar,
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { Link } from "@/design/components/link";
import { Icon } from "@/design/components/icon";
import { SurfaceSegmentedControl } from "@/design/components/segmented-control";
import {
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_END,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface-classes";
import { SurfaceAnchor } from "@/design/components/surface";
import { cn } from "@/design/ui";
import { useMediaType } from "@/features/media/context";
import { getMovieSocialProofAction } from "./actions";
import { AVATAR_OVERLAP } from "./constants";
import type {
  Friend,
  MovieSocialProof as Proof,
  MutualFollowers,
  ProofTab,
  SocialPerson,
  SocialProofSurfaceData,
} from "./types";
import { cutout, describeProof, formatNames, matchesTab } from "./utils";

export function AvatarStack({
  max = 4,
  people,
  round = false,
  size = 28,
}: {
  max?: number;
  people: readonly SocialPerson[];
  round?: boolean;
  size?: number;
}): JSX.Element {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {people.slice(0, max).map((person, index) => (
        <Avatar
          className={cn(round && "rounded-full")}
          key={person.id}
          name={person.displayName}
          size={size}
          src={person.avatarUrl}
          style={{
            marginLeft: index === 0 ? 0 : -Math.round(size * AVATAR_OVERLAP),
            zIndex: max - index,
            ...(index === 0 ? null : cutout(size, round)),
          }}
        />
      ))}
    </span>
  );
}

export function FollowedBy({
  mutual,
}: {
  mutual: MutualFollowers;
}): JSX.Element | null {
  if (mutual.people.length === 0) return null;

  const names = mutual.people.map((person) => person.displayName);
  const text = formatNames(names, names.length, mutual.total);

  return (
    <div className="flex min-w-0 items-center gap-2.5 type-meta text-ink-body">
      <AvatarStack people={mutual.people} round size={22} />
      <span className="min-w-0 truncate">
        Followed by <span className="font-semibold text-ink">{text}</span> you
        follow
      </span>
    </div>
  );
}

function createSocialProofSurfaceEntry(
  data: SocialProofSurfaceData,
): SurfaceEntry {
  return {
    component: SocialProofSurface,
    description: data.title,
    icon: "solar:users-group-rounded-bold",
    props: { data },
    title: "People you follow",
  };
}

function Signal({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: string;
  label: string;
}): JSX.Element | null {
  if (!active) return null;
  return (
    <span
      className="text-ink-muted group-hover/friend:text-ink-body group-focus-visible/friend:text-ink-body group-has-focus-visible/friend:text-ink-body"
      title={label}
    >
      <Icon aria-label={label} icon={icon} size={15} />
    </span>
  );
}

function FriendRow({
  close,
  friend,
  movieId,
}: {
  close: () => void;
  friend: Friend;
  movieId: number;
}): JSX.Element {
  const highlight = useHighlight(friend.id);

  return (
    <li
      className={cn(
        tileVariants(),
        SURFACE_TILE_END,
        "group/friend relative isolate",
      )}
      {...highlight.props}
    >
      {highlight.node}
      <Link
        className={`relative z-10 flex min-w-0 flex-1 items-center gap-3 ${SURFACE_TILE_INNER}`}
        href={accountHref(friend.username)}
        onClick={close}
        prefetch={false}
      >
        <Avatar
          className={SURFACE_TILE_INNER}
          name={friend.displayName}
          size={40}
          src={friend.avatarUrl}
        />
        <span className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>{friend.displayName}</span>
          <span
            className={`${SURFACE_META} group-hover/friend:text-ink-body group-focus-visible/friend:text-ink-body group-has-focus-visible/friend:text-ink-body`}
          >
            @{friend.username}
          </span>
        </span>
      </Link>

      <span className="relative z-10 flex shrink-0 items-center gap-2.5">
        {friend.rating !== null ? (
          <RatingStars rating={friend.rating} size={12} />
        ) : null}
        <Signal active={friend.watched} icon="solar:eye-bold" label="Watched" />
        <Signal active={friend.liked} icon="solar:heart-bold" label="Liked" />
        <Signal
          active={friend.watchlisted}
          icon="solar:bookmark-bold"
          label="Wants to watch"
        />
        {friend.reviewed ? (
          <Link
            aria-label={`Read ${friend.displayName}'s review`}
            className="center -m-1.5 size-7 rounded-full text-ink-muted group-hover/friend:text-ink-body group-focus-visible/friend:text-ink-body group-has-focus-visible/friend:text-ink-body hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink"
            href={reviewHref(movieId, friend.username)}
            onClick={close}
            prefetch={false}
            title="Read review"
          >
            <Icon icon="solar:chat-round-bold" size={15} />
          </Link>
        ) : null}
      </span>
    </li>
  );
}

function SocialProofSurface({
  data,
}: {
  data: SocialProofSurfaceData;
}): JSX.Element {
  const { closeSurface } = useDockActions();
  const { counts, friends } = data.proof;
  const [tab, setTab] = useState<ProofTab>("all");

  const tabs = useMemo(
    () =>
      [
        { count: friends.length, key: "all", label: "All" },
        { count: counts.watched, key: "watched", label: "Watched" },
        { count: counts.liked, key: "liked", label: "Liked" },
        { count: counts.watchlist, key: "watchlist", label: "To watch" },
        { count: counts.reviews, key: "reviews", label: "Reviews" },
      ].filter((item) => item.key === "all" || item.count > 0) as {
        count: number;
        key: ProofTab;
        label: string;
      }[],
    [counts, friends.length],
  );

  const visible = useMemo(
    () => friends.filter((friend) => matchesTab(friend, tab)),
    [friends, tab],
  );

  return (
    <div className={SURFACE_STACK}>
      <SurfaceAnchor />
      {tabs.length > 2 ? (
        <SurfaceSegmentedControl
          ariaLabel="Filter by what they did"
          id="social-proof-tabs"
          items={tabs}
          onChange={setTab}
          value={tab}
        />
      ) : null}

      <HighlightGroup>
        <ul
          className={`${SURFACE_SCROLL} flex max-h-[min(56dvh,26rem)] flex-col gap-2.5`}
          data-scroll-native
        >
          {visible.map((friend) => (
            <FriendRow
              close={() => closeSurface?.()}
              friend={friend}
              key={friend.id}
              movieId={data.movieId}
            />
          ))}
        </ul>
      </HighlightGroup>

      {data.proof.total > friends.length ? (
        <p className="text-center type-meta text-ink-muted">
          Showing the {friends.length} most recent of {data.proof.total}.
        </p>
      ) : null}
    </div>
  );
}

export function MovieSocialProof({
  movieId,
  part = "proof",
  title,
}: {
  movieId: number;
  part?: string;
  title: string;
}): JSX.Element {
  const mediaType = useMediaType();
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ? `${userId}:${mediaType}:${movieId}` : null;

  const [loaded, setLoaded] = useState<{ key: string; proof: Proof } | null>(
    null,
  );

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getMovieSocialProofAction(movieId, mediaType)
      .then((result) => {
        if (cancelled) return;
        if (!result.success)
          return report("MovieSocialProof load", result.error);
        if (result.proof) setLoaded({ key, proof: result.proof });
      })
      .catch((error) => report("MovieSocialProof load", error));

    return () => {
      cancelled = true;
    };
  }, [key, mediaType, movieId]);

  const proof = loaded?.key === key ? loaded.proof : null;
  const open = Boolean(proof && proof.friends.length > 0);
  const summary = proof && open ? describeProof(proof) : null;

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-reveal ease-out-expo",
        open
          ? "mt-0 grid-rows-[1fr] opacity-100"
          : "-mt-3 grid-rows-[0fr] opacity-0",
      )}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">
        {proof && summary ? (
          <StagePart name={part}>
            <Button
              className="cine-card cine-fade group relative flex h-14 w-full cursor-pointer items-center overflow-hidden rounded-full bg-fill px-3.5 text-left ring-1 ring-edge ring-inset hover:bg-fill-hover focus-visible:bg-fill-hover hover:ring-edge-hover focus-visible:ring-edge-focus"
              onClick={() =>
                void openSurface(
                  createSocialProofSurfaceEntry({ movieId, proof, title }),
                )
              }
              type="button"
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <AvatarStack people={proof.friends} round />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate type-meta font-semibold text-ink">
                    {summary.headline}
                  </span>
                  {summary.details ? (
                    <span className="truncate type-label text-ink-body">
                      {summary.details}
                    </span>
                  ) : null}
                </span>
                <Icon
                  className="shrink-0 text-ink-muted transition-colors duration-light group-hover:text-ink group-focus-visible:text-ink group-has-focus-visible:text-ink"
                  icon="solar:alt-arrow-right-linear"
                  size={16}
                />
              </span>
            </Button>
          </StagePart>
        ) : null}
      </div>
    </div>
  );
}
