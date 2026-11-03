"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdaptiveImage, BackdropHero, Icon } from "@/ui";
import { Room } from "@/motion/engine";
import {
  applyAvatarFallback,
  getInitial,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../avatar";
import { SOCIAL_EVENTS } from "../constants";
import type { PublicAccount } from "../types";
import { AccountPart, AccountStageRoot, AccountText } from "../motion";
import { AvatarStage } from "./avatar";
import { AccountView } from "./view";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import {
  useAmbientTheme,
  type AmbientPalette,
} from "@omerdlw/base-framework/modules/ambient";
import {
  pathOf,
  useNavigationPayload,
  type NavigationTrip,
} from "@omerdlw/base-framework/modules/navigation";
import { createAccountSocialSurfaceEntry } from "../surfaces/social";
import { ProfileStatButton, ProfileStatRow } from "./stats";
import { accountHref } from "@/config/routes";

const DEFAULT_DISPLAY_NAME = "Account";

const JOIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

const AVATAR_CLASSES =
  "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/60 type-display-xs font-semibold text-ink ring-2 ring-edge-hover select-none sm:size-24";

const CONTAINER = "mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8";

export type AccountData = PublicAccount;

function formatJoinDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : JOIN_DATE_FORMATTER.format(date);
}

function resolveAccountBackdropUrl(
  profile?: AccountData | null,
): string | null {
  const background = profile?.backgroundUrl?.trim() ?? "";
  if (!background) return null;
  return /^(https?:\/\/|\/|data:image\/)/.test(background) ? background : null;
}

// A trip to another of the member's tabs changes the page in place; only a
// trip away from the member leaves it.
const leavesAccount = (base?: string) => (trip: NavigationTrip) => {
  if (!base) return pathOf(trip.to) !== pathOf(trip.from);
  const to = pathOf(trip.to).replace(/\/+$/, "") || "/";
  return to !== base && !to.startsWith(`${base}/`);
};

function getAccountDisplayName(account?: AccountData | null): string {
  return account?.displayName || account?.username || DEFAULT_DISPLAY_NAME;
}

function useSocialFollowSync(
  accountId?: string | null,
  initialCount = 0,
  initialStatus = false,
) {
  const [isFollower, setIsFollower] = useState(initialStatus);
  const [prevAccountId, setPrevAccountId] = useState(accountId);
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialStatus);
  const [prevInitialCount, setPrevInitialCount] = useState(initialCount);
  const [baseCount, setBaseCount] = useState(initialCount);

  if (accountId !== prevAccountId) {
    setPrevAccountId(accountId);
    setPrevInitialStatus(initialStatus);
    setPrevInitialCount(initialCount);
    setIsFollower(initialStatus);
    setBaseCount(initialCount);
  } else {
    if (initialStatus !== prevInitialStatus) {
      setPrevInitialStatus(initialStatus);
      setIsFollower(initialStatus);
    }
    if (initialCount !== prevInitialCount) {
      setPrevInitialCount(initialCount);
      setBaseCount(initialCount);
    }
  }

  useGlobalEvent(accountId ? SOCIAL_EVENTS.FOLLOW_CHANGE : null, (payload) => {
    if (payload.followingId === accountId) {
      setIsFollower(payload.status === "accepted");
    }
  });

  const delta = isFollower === prevInitialStatus ? 0 : isFollower ? 1 : -1;
  const followersCount = Math.max(0, baseCount + delta);

  return {
    followersCount,
    isFollower,
  };
}

interface AccountBackdropHeroProps {
  image?: string | null;
}

// The background is projected once it has loaded; the opening waits for it.
function AccountBackdropHero({ image }: AccountBackdropHeroProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!image) return;
    const picture = new Image();
    picture.onload = picture.onerror = () => setReady(true);
    picture.src = image;
    if (picture.complete) setReady(true);
  }, [image]);

  return (
    <div className="relative">
      <AccountPart name="backdrop" ready={ready}>
        <BackdropHero
          image={image}
          position="center 25%"
          className="lg:h-[clamp(28rem,40vw,34rem)] xl:h-[clamp(30rem,42vw,36rem)]"
        />
      </AccountPart>
    </div>
  );
}

function PrivateLockedView() {
  return (
    <div className="flex min-h-56 w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center rounded-sheet ring-1 ring-edge-hover ring-inset">
      <span className="center size-11 rounded-full bg-fill text-ink-body">
        <Icon icon="solar:lock-bold" size={20} />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="type-body font-semibold text-ink">
          This account is private
        </h2>
        <p className="type-body text-ink-muted">
          Follow this account to see their films, reviews and lists.
        </p>
      </div>
    </div>
  );
}

interface AccountHeroProps {
  account?: AccountData | null;
  followersCount?: number;
  followingCount?: number;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
}

function AccountHero({
  account,
  followersCount = 0,
  followingCount = 0,
  palette: served = null,
  proofSlot,
  statsSlot,
}: AccountHeroProps) {
  const { openSurface } = useDockActions();

  const displayName = getAccountDisplayName(account);
  const backdropUrl = resolveAccountBackdropUrl(account);
  const joinDate = formatJoinDate(account?.createdAt) || "—";

  const { palette } = useAmbientTheme({
    image: backdropUrl || account?.avatarUrl || null,
    initialPalette: served,
  });
  useNavigationPayload("palette", palette);

  const openSocial = (tab: "following" | "followers") => {
    if (!account?.id) return;
    openSurface(
      createAccountSocialSurfaceEntry({
        avatarUrl: getUserAvatarUrl(account),
        displayName,
        tab,
        userId: account.id,
        username: account.username,
      }),
    );
  };

  const paddingClass = backdropUrl
    ? "-mt-20 pb-6 sm:-mt-28 sm:pb-8 lg:-mt-36 lg:pb-10"
    : "pt-24 pb-6 sm:pt-28 sm:pb-8 lg:pt-32 lg:pb-10";

  const meta: { key: string; node: ReactNode }[] = [];
  if (account?.username) {
    meta.push({ key: "handle", node: <span>@{account.username}</span> });
  }
  meta.push({ key: "joined", node: <span>Joined {joinDate}</span> });
  if (account?.isPrivate) {
    meta.push({
      key: "private",
      node: (
        <span className="inline-flex items-center gap-1">
          <Icon icon="solar:lock-bold" size={12} />
          Private
        </span>
      ),
    });
  }

  return (
    <>
      {backdropUrl && <AccountBackdropHero image={backdropUrl} />}

      <div className={`relative z-10 w-full ${paddingClass}`}>
        <div className="relative z-10 flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            <AvatarStage
              className={AVATAR_CLASSES}
              label={`${displayName} avatar`}
            >
              {account?.avatarUrl ? (
                <AdaptiveImage
                  alt=""
                  className="size-full object-cover"
                  onError={(e) =>
                    applyAvatarFallback(e, getUserAvatarFallbackUrl(account))
                  }
                  src={account.avatarUrl}
                />
              ) : (
                getInitial(displayName || account?.username)
              )}
            </AvatarStage>

            <div className="flex min-w-0 flex-1 flex-col">
              <AccountText
                as="h1"
                className="font-zuume max-w-full type-display-xs leading-none font-bold text-ink uppercase [overflow-wrap:anywhere] sm:type-display-sm lg:type-display-md"
                mask
                part="name"
                text={displayName}
              />

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 type-control text-ink-muted sm:type-body">
                {meta.map((item, index) => (
                  <AccountPart
                    as="div"
                    className="inline-flex items-center gap-x-2.5"
                    index={index}
                    key={item.key}
                    name="meta"
                  >
                    {index > 0 ? (
                      <span className="text-ink-faint">•</span>
                    ) : null}
                    {item.node}
                  </AccountPart>
                ))}
              </div>

              {proofSlot ? (
                <AccountPart className="mt-3 flex" name="proof">
                  {proofSlot}
                </AccountPart>
              ) : null}
            </div>
          </div>

          <AccountPart className="shrink-0" name="stats">
            <ProfileStatRow>
              {statsSlot}
              <ProfileStatButton
                count={followingCount}
                label="Following"
                onClick={() => openSocial("following")}
              />
              <ProfileStatButton
                count={followersCount}
                label="Followers"
                onClick={() => openSocial("followers")}
              />
            </ProfileStatRow>
          </AccountPart>
        </div>
      </div>
    </>
  );
}

interface AccountLayoutProps {
  account?: AccountData | null;
  children?: ReactNode;
  followersCount?: number;
  followingCount?: number;
  isFollower?: boolean;
  isOwner?: boolean;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
  tabsSlot?: ReactNode;
}

export function AccountLayout({
  account,
  children,
  followersCount: initialFollowersCount = 0,
  followingCount = 0,
  isFollower: initialIsFollower = false,
  isOwner = false,
  palette = null,
  proofSlot,
  statsSlot,
  tabsSlot,
}: AccountLayoutProps) {
  const { followersCount, isFollower } = useSocialFollowSync(
    account?.id,
    initialFollowersCount,
    initialIsFollower,
  );

  const pathname = usePathname();
  const isPrivateLocked = account?.isPrivate && !isOwner && !isFollower;
  const scope = account?.username ? accountHref(account.username) : undefined;
  const backdropUrl = resolveAccountBackdropUrl(account);

  return (
    <AccountStageRoot
      grade={backdropUrl || account?.avatarUrl || null}
      leaves={leavesAccount(scope)}
    >
      <Room />
      <main
        className="account-page ui-scene min-h-screen overflow-x-clip pb-[calc(var(--dock-h,6rem)+3rem)]"
        data-cinematic=""
      >
        <div className="relative z-10 w-full [overflow-anchor:none]">
          {tabsSlot && !isPrivateLocked ? (
            <AccountPart className="absolute inset-x-0 top-0 z-20" name="tabs">
              <div data-backdrop={backdropUrl ? "" : undefined}>{tabsSlot}</div>
            </AccountPart>
          ) : null}

          <div className={CONTAINER}>
            <AccountHero
              account={account}
              followersCount={followersCount}
              followingCount={followingCount}
              palette={palette}
              proofSlot={proofSlot}
              statsSlot={isPrivateLocked ? null : statsSlot}
            />
          </div>

          <div className={CONTAINER}>
            <AccountView id={isPrivateLocked ? "locked" : pathname}>
              {isPrivateLocked ? <PrivateLockedView /> : children}
            </AccountView>
          </div>
        </div>
      </main>
    </AccountStageRoot>
  );
}
