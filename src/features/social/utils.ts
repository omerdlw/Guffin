import type { CSSProperties } from "react";
import { pluralize } from "@/lib/format";
import { AVATAR_CUTOUT_GAP, AVATAR_OVERLAP } from "./constants";
import type {
  Friend,
  MovieProofRow,
  MovieSocialProof,
  ProofTab,
  SocialPerson,
} from "./types";

export function toPerson(row: {
  account_id: string;
  avatar_url: string | null;
  display_name: string | null;
  username: string;
}): SocialPerson {
  return {
    avatarUrl: row.avatar_url,
    displayName: row.display_name?.trim() || row.username,
    id: row.account_id,
    username: row.username,
  };
}

export function buildMovieSocialProof(
  rows: readonly MovieProofRow[],
): MovieSocialProof {
  const friends: Friend[] = rows.map((row) => {
    const rating = row.rating === null ? null : Number(row.rating);
    return {
      ...toPerson(row),
      liked: row.liked,
      rating: rating !== null && Number.isFinite(rating) ? rating : null,
      reviewed: row.reviewed,
      watched: row.watched,
      watchlisted: row.watchlisted && !row.watched,
    };
  });

  const rated = friends.flatMap((friend) =>
    friend.rating === null ? [] : [friend.rating],
  );

  return {
    averageRating:
      rated.length > 0
        ? rated.reduce((sum, rating) => sum + rating, 0) / rated.length
        : null,
    counts: {
      liked: friends.filter((friend) => friend.liked).length,
      ratings: rated.length,
      reviews: friends.filter((friend) => friend.reviewed).length,
      watched: friends.filter((friend) => friend.watched).length,
      watchlist: friends.filter((friend) => friend.watchlisted).length,
    },
    friends,
    total: Number(rows[0]?.total ?? 0),
  };
}

const othersLabel = (count: number) =>
  `${count} ${count === 1 ? "other" : "others"}`;

export function formatNames(
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

export function matchesTab(friend: Friend, tab: ProofTab): boolean {
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

export function describeProof(proof: MovieSocialProof): {
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

export function cutout(size: number, round: boolean): CSSProperties {
  const overlap = Math.round(size * AVATAR_OVERLAP);
  const mask = round
    ? `radial-gradient(circle at ${overlap - size / 2}px 50%, transparent ${size / 2 + AVATAR_CUTOUT_GAP}px, #000 ${size / 2 + AVATAR_CUTOUT_GAP + 0.5}px)`
    : `linear-gradient(to right, transparent ${overlap + AVATAR_CUTOUT_GAP}px, #000 ${overlap + AVATAR_CUTOUT_GAP}px)`;
  return { WebkitMaskImage: mask, maskImage: mask };
}
