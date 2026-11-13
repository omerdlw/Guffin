"use client";

import { type JSX, type ReactNode, useEffect, useRef, useState } from "react";
import { useAmbientTheme } from "@omerdlw/base-framework/ambient";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useNavigationPayload } from "@omerdlw/base-framework/navigation";
import { Image } from "@omerdlw/base-framework/ui";
import { usePathname } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { TextButton } from "@/design/components/link";
import { OVERLAP } from "@/design/foundations/layout";
import { cn } from "@/design/ui";
import {
  applyAvatarFallback,
  getInitial,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  SOCIAL_EVENTS,
} from "@/features/account/account";
import { accountBioSurface } from "@/features/account/bio-surface";
import { BackdropProjection } from "@/features/detail/stage";
import { followsSurface } from "@/features/social/follows-surface";
import { accountHref } from "@/lib/project";
import { Room } from "@/motion/kit";
import { ProfileStatButton, ProfileStatRow } from "./blocks";
import {
  AVATAR_CLASSES,
  BIO_CLAMP_CLASS,
  PROFILE_CONTAINER_CLASS,
} from "./constants";
import { PlanGuides } from "./guides";
import {
  AccountPart,
  AccountStageRoot,
  AccountText,
  useAccountPart,
} from "./motion";
import { AccountView } from "./shell";
import type {
  AccountBackdropHeroProps,
  AccountHeroProps,
  AccountLayoutProps,
} from "./types";
import {
  formatJoinDate,
  getAccountDisplayName,
  leavesAccount,
  resolveAccountBackdropUrl,
} from "./utils";

function AvatarStage({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      {...useAccountPart("avatar")}
      aria-label={label}
      className={className}
      role="img"
    >
      {children}
    </div>
  );
}

function useSocialFollowSync(
  accountId?: string | null,
  initialCount = 0,
  initialStatus = false,
) {
  const served = { accountId, count: initialCount, status: initialStatus };
  const [seen, setSeen] = useState(served);
  const [sync, setSync] = useState({
    baseCount: initialCount,
    isFollower: initialStatus,
  });

  if (accountId !== seen.accountId) {
    setSeen(served);
    setSync({ baseCount: initialCount, isFollower: initialStatus });
  } else if (initialStatus !== seen.status || initialCount !== seen.count) {
    setSeen(served);
    setSync((current) => ({
      baseCount: initialCount !== seen.count ? initialCount : current.baseCount,
      isFollower:
        initialStatus !== seen.status ? initialStatus : current.isFollower,
    }));
  }

  useGlobalEvent(accountId ? SOCIAL_EVENTS.FOLLOW_CHANGE : null, (payload) => {
    if (payload.followingId === accountId) {
      setSync((current) => ({
        ...current,
        isFollower: payload.status === "accepted",
      }));
    }
  });

  const delta = sync.isFollower === seen.status ? 0 : sync.isFollower ? 1 : -1;
  return {
    followersCount: Math.max(0, sync.baseCount + delta),
    isFollower: sync.isFollower,
  };
}

function AccountBackdropHero({ image }: AccountBackdropHeroProps) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative">
      <AccountPart name="backdrop" ready={ready}>
        <BackdropProjection onReady={() => setReady(true)} src={image ?? ""} />
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
      followsSurface({
        data: {
          avatarUrl: getUserAvatarUrl(account),
          displayName,
          tab,
          userId: account.id,
          username: account.username,
        },
      }),
    );
  };

  const paddingClass = backdropUrl
    ? `${OVERLAP} pb-fib-4 sm:pb-fib-5`
    : "pt-24 pb-fib-4 sm:pt-28 sm:pb-fib-5 lg:pt-32";

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
        <div className="plan relative z-10 gap-y-fib-4 lg:items-end">
          <div className="plan-main flex min-w-0 items-center gap-fib-4 sm:gap-fib-5">
            <AvatarStage
              className={AVATAR_CLASSES}
              label={`${displayName} avatar`}
            >
              {account?.avatarUrl ? (
                <Image
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

          <div className="plan-aside min-w-0">
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
          </div>
        </div>
      </div>
    </>
  );
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
      <Room grain={false} />
      <main
        id="main"
        className="account-page ui-scene relative min-h-screen overflow-x-clip pb-[calc(var(--dock-h,6rem)+3rem)]"
        data-cinematic=""
      >
        <PlanGuides />
        <div className="relative z-10 w-full [overflow-anchor:none]">
          {tabsSlot && !isPrivateLocked ? (
            <AccountPart className="absolute inset-x-0 top-0 z-20" name="tabs">
              <div data-backdrop={backdropUrl ? "" : undefined}>{tabsSlot}</div>
            </AccountPart>
          ) : null}

          <div className={PROFILE_CONTAINER_CLASS}>
            <AccountHero
              account={account}
              followersCount={followersCount}
              followingCount={followingCount}
              palette={palette}
              proofSlot={proofSlot}
              statsSlot={isPrivateLocked ? null : statsSlot}
            />
          </div>

          <div className={PROFILE_CONTAINER_CLASS}>
            <AccountView id={isPrivateLocked ? "locked" : pathname}>
              {isPrivateLocked ? <PrivateLockedView /> : children}
            </AccountView>
          </div>
        </div>
      </main>
    </AccountStageRoot>
  );
}

export function AccountBio({
  bio,
  displayName,
  username,
}: {
  bio: string;
  displayName: string;
  username: string;
}): JSX.Element {
  const { openSurface } = useDockActions();
  const text = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const element = text.current;
    if (!element) return;
    const measure = () => {
      element.classList.remove("line-clamp-3");
      const full = element.scrollHeight;
      element.classList.add("line-clamp-3");
      setCut(full > element.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bio]);

  const open = () =>
    openSurface(accountBioSurface({ bio, displayName, username }));

  return (
    <div className="relative type-control leading-5">
      <p
        className={cn(
          "line-clamp-3 [overflow-wrap:anywhere] whitespace-pre-line text-ink-body",
          cut && BIO_CLAMP_CLASS,
        )}
        ref={text}
      >
        {bio}
      </p>
      {cut ? (
        <TextButton
          className="absolute right-0 bottom-0 font-medium text-ink-body"
          variant="inline"
          onClick={open}
          type="button"
        >
          read more
        </TextButton>
      ) : null}
    </div>
  );
}
