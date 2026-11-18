"use client";

import {
  type CSSProperties,
  type JSX,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import {
  Avatar,
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { report } from "@omerdlw/base-framework/utils";
import { Icon } from "@/design/components/icon";
import { Link } from "@/design/components/link";
import { SurfaceSegmentedControl } from "@/design/components/segmented-control";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import {
  GROUP_HIGHLIGHT,
  groupRowVariants,
  SURFACE_GROUP,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import { TONE } from "@/design/foundations/tones";
import { defineSurface } from "@/design/surface-definition";
import { cn } from "@/design/ui";
import { useAuth } from "@/features/auth/provider";
import { useMediaType } from "@/features/media/media-type";
import { COLLECTION_MARKS } from "@/features/movie/movie";
import { RatingStars } from "@/features/reviews/rating";
import { pluralize } from "@/lib/format";
import { accountHref, reviewHref } from "@/lib/project";
import { Part } from "@/motion/stage";
import { getMovieSocialProofAction } from "./actions";
import type {
  Friend,
  MovieSocialProof,
  MovieSocialProof as Proof,
  MutualFollowers,
  SocialPerson,
} from "./social";

type ProofTab = "all" | "watched" | "liked" | "watchlist" | "reviews";

interface SocialProofSurfaceData {
  movieId: number;
  proof: MovieSocialProof;
  title: string;
}

const AVATAR_OVERLAP = 0.3;

const AVATAR_CUTOUT_GAP = 2;

const othersLabel = (count: number) =>
  `${count} ${count === 1 ? "other" : "others"}`;

function formatNames(
  names: readonly string[],
  shown = 2,
  total = names.length,
): string {
  const hidden = total - Math.min(names.length, shown);
  if (hidden > 0) {
    return `${names.slice(0, shown).join(", ")} and ${othersLabel(hidden)}`;
  }
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function matchesTab(friend: Friend, tab: ProofTab): boolean {
  switch (tab) {
    case "watched":
      return friend.watched;
    case "liked":
      return friend.liked;
    case "watchlist":
      return friend.watchlisted;
    case "reviews":
      return friend.reviewed;
    default:
      return true;
  }
}

function describeProof(proof: MovieSocialProof): {
  details: string;
  headline: string;
} {
  const { counts, friends } = proof;
  const namesOf = (pick: (friend: Friend) => boolean) =>
    friends.filter(pick).map((friend) => friend.displayName);

  let headline: string;
  let lead: "liked" | "watched" | "watchlist";
  if (counts.watched > 0) {
    headline = `${formatNames(namesOf((friend) => friend.watched))} watched this`;
    lead = "watched";
  } else if (counts.watchlist > 0) {
    const names = namesOf((friend) => friend.watchlisted);
    headline = `${formatNames(names)} ${names.length === 1 ? "wants" : "want"} to watch this`;
    lead = "watchlist";
  } else {
    headline = `${formatNames(namesOf((friend) => friend.liked))} liked this`;
    lead = "liked";
  }

  const details: string[] = [];
  if (lead !== "liked" && counts.liked > 0) {
    details.push(`${counts.liked} liked`);
  }
  if (counts.reviews > 0) {
    details.push(pluralize(counts.reviews, "review"));
  }
  if (lead !== "watchlist" && counts.watchlist > 0) {
    details.push(`${counts.watchlist} to watch`);
  }
  if (proof.averageRating !== null) {
    details.push(`★ ${proof.averageRating.toFixed(1)} average`);
  }

  return { details: details.join(" · "), headline };
}

function cutout(size: number, round: boolean): CSSProperties {
  const overlap = Math.round(size * AVATAR_OVERLAP);
  const mask = round
    ? `radial-gradient(circle at ${overlap - size / 2}px 50%, transparent ${size / 2 + AVATAR_CUTOUT_GAP}px, #000 ${size / 2 + AVATAR_CUTOUT_GAP + 0.5}px)`
    : `linear-gradient(to right, transparent ${overlap + AVATAR_CUTOUT_GAP}px, #000 ${overlap + AVATAR_CUTOUT_GAP}px)`;
  return { WebkitMaskImage: mask, maskImage: mask };
}

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

const socialProofSurface = defineSurface<{ data: SocialProofSurfaceData }>({
  component: SocialProofSurface,
  description: ({ data }) => data.title,
  icon: "solar:users-group-rounded-bold",
  title: "People you follow",
});

// The surface sorts the people you follow by their verdict: who loved it,
// who liked it, who was mixed, who didn't, then who saw it without a
// rating and who means to. Each verdict is one sheet under a small caps
// name, so the mood of the room reads from the headings before the names.

interface Verdict {
  key: string;
  label: string;
  range?: string;
  take: (friend: Friend) => boolean;
}

const rated = (friend: Friend, min: number, max: number) =>
  friend.rating !== null && friend.rating >= min && friend.rating <= max;

const VERDICTS: readonly Verdict[] = [
  {
    key: "loved",
    label: "Loved it",
    range: "4½–5",
    take: (friend) => rated(friend, 4.5, 5),
  },
  {
    key: "liked",
    label: "Liked it",
    range: "3½–4",
    take: (friend) => rated(friend, 3.5, 4.49),
  },
  {
    key: "mixed",
    label: "Mixed",
    range: "2½–3",
    take: (friend) => rated(friend, 2.5, 3.49),
  },
  {
    key: "disliked",
    label: "Didn't like it",
    range: "½–2",
    take: (friend) => rated(friend, 0, 2.49),
  },
  {
    key: "seen",
    label: "Watched",
    take: (friend) =>
      friend.rating === null &&
      (friend.watched || friend.liked || friend.reviewed),
  },
  {
    key: "waiting",
    label: "Want to watch",
    take: (friend) =>
      friend.rating === null &&
      !friend.watched &&
      !friend.liked &&
      !friend.reviewed &&
      friend.watchlisted,
  },
];

const SIGNAL_INK =
  "text-ink-muted group-hover:text-ink-body group-focus-visible:text-ink-body group-has-focus-visible:text-ink-body";

function FriendRow({
  close,
  friend,
  movieId,
}: {
  close: () => void;
  friend: Friend;
  movieId: number;
}): JSX.Element {
  const highlight = useHighlight(friend.id, GROUP_HIGHLIGHT);
  return (
    <li
      className={groupRowVariants({ className: "pr-3" })}
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
          className="rounded-full"
          name={friend.displayName}
          size={40}
          src={friend.avatarUrl}
        />
        <span className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>{friend.displayName}</span>
          <span className={SURFACE_META}>@{friend.username}</span>
        </span>
      </Link>

      <span className="relative z-10 flex shrink-0 items-center gap-2.5">
        {friend.rating !== null ? (
          <RatingStars rating={friend.rating} size={12} />
        ) : null}
        {friend.liked ? (
          <span className={COLLECTION_MARKS.like} title="Liked">
            <Icon aria-label="Liked" icon="solar:heart-bold" size={15} />
          </span>
        ) : null}
        {friend.reviewed ? (
          <Link
            aria-label={`Read ${friend.displayName}'s review`}
            className={cn(
              "center -m-1.5 size-7 rounded-full hover:bg-fill-hover hover:text-ink focus-visible:bg-fill-hover focus-visible:text-ink",
              SIGNAL_INK,
            )}
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
  const close = () => closeSurface?.();
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

  const groups = useMemo(() => {
    const visible = friends.filter((friend) => matchesTab(friend, tab));
    return VERDICTS.map((verdict) => ({
      ...verdict,
      people: visible
        .filter(verdict.take)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    })).filter((group) => group.people.length > 0);
  }, [friends, tab]);

  return (
    <SurfaceStage className={SURFACE_STACK}>
      {/* On the shelf, not in the stack: a part around it would stay
          behind empty and take the stack's gap above the list. */}
      {tabs.length > 2 ? (
        <SurfaceSegmentedControl
          ariaLabel="Filter by what they did"
          id="social-proof-tabs"
          items={tabs}
          onChange={setTab}
          value={tab}
        />
      ) : null}

      <SurfaceSwap cue="rows" id={tab}>
        <div
          className={`${SURFACE_SCROLL} flex max-h-[min(56dvh,26rem)] flex-col gap-4`}
          data-scroll-native
        >
          {groups.map((group, index) => (
            <SurfacePart
              className="flex flex-col gap-2"
              index={index}
              key={group.key}
              name="row"
            >
              <p className={cn(TONE.label, "flex gap-1.5 px-3 text-ink-muted")}>
                {group.label}
                {group.range ? (
                  <span className="text-ink-faint">· {group.range}</span>
                ) : null}
              </p>
              <HighlightGroup className={SURFACE_GROUP}>
                <ul className="flex flex-col">
                  {group.people.map((friend) => (
                    <FriendRow
                      close={close}
                      friend={friend}
                      key={friend.id}
                      movieId={data.movieId}
                    />
                  ))}
                </ul>
              </HighlightGroup>
            </SurfacePart>
          ))}
        </div>
      </SurfaceSwap>

      {data.proof.total > friends.length ? (
        <SurfacePart name="note">
          <p className="text-center type-meta text-ink-muted">
            Showing the {friends.length} most recent of {data.proof.total}.
          </p>
        </SurfacePart>
      ) : null}
    </SurfaceStage>
  );
}

const PROOF_PILL =
  "cine-card liquid-control group relative flex h-14 w-full items-center overflow-hidden rounded-full bg-fill px-3.5 text-left ring-1 ring-edge ring-inset";

// Friends' activity on a film, the last of the sidebar's actions: it joins
// the action group's entrance at its `index`, showing a loader in place while
// the activity loads, and gives way when no friend has logged the film.
export function MovieSocialProof({
  index,
  movieId,
  part = "action",
  title,
}: {
  index?: number;
  movieId: number;
  part?: string;
  title: string;
}): JSX.Element | null {
  const mediaType = useMediaType();
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ? `${userId}:${mediaType}:${movieId}` : null;

  const [loaded, setLoaded] = useState<{
    key: string;
    proof: Proof | null;
  } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const settle = (proof: Proof | null) => {
      if (!cancelled) setLoaded({ key, proof });
    };

    getMovieSocialProofAction(movieId, mediaType)
      .then((result) => {
        if (!result.success) {
          report("MovieSocialProof load", result.error);
          return settle(null);
        }
        settle(result.proof ?? null);
      })
      .catch((error) => {
        report("MovieSocialProof load", error);
        settle(null);
      });

    return () => {
      cancelled = true;
    };
  }, [key, mediaType, movieId]);

  if (!key) return null;
  const settled = loaded?.key === key;
  const proof = settled ? loaded.proof : null;
  const summary =
    proof && proof.friends.length > 0 ? describeProof(proof) : null;
  if (settled && !summary) return null;

  return (
    <Part index={index} name={part}>
      {proof && summary ? (
        <Button
          className={cn(PROOF_PILL, "cursor-pointer")}
          onClick={() =>
            void openSurface(
              socialProofSurface({ data: { movieId, proof, title } }),
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
              className="shrink-0 text-ink-muted group-hover:text-ink group-focus-visible:text-ink group-has-focus-visible:text-ink"
              icon="solar:alt-arrow-right-linear"
              size={16}
            />
          </span>
        </Button>
      ) : (
        <div aria-busy="true" className={PROOF_PILL} role="status">
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <Icon
              className="shrink-0 text-ink-muted"
              icon="svg-spinners:90-ring-with-bg"
              size={16}
            />
            <span className="truncate type-meta text-ink-muted">
              Loading friends’ activity…
            </span>
          </span>
        </div>
      )}
    </Part>
  );
}
