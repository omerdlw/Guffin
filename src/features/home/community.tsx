"use client";

import { type JSX, useState, useTransition } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/account/actions";
import { SOCIAL_EVENTS } from "@/features/account/constants";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { accountHref } from "@/lib/project";
import { AccountLink, Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Avatar, Icon } from "@/ui/media";
import { HEADLINE_BOX, PRIMARY, TONE } from "@/ui/tokens";
import { JOIN_POINTS, TEXT_LINK_CLASS } from "./constants";
import { Heading, HomeCount, HomePart, HomeSection } from "./motion";
import type { MemberFollowState, HomeMember, Pulse } from "./types";
import { formatCompact, formatWhole } from "./utils";

export function HomeJoin({ members }: { members: number }): JSX.Element | null {
  const auth = useAuth();
  const openSignIn = useOpenSignIn();
  if (auth.isAuthenticated) return null;

  return (
    <HomeSection className="flex w-full flex-col" cue="join">
      <HomePart className="h-px w-full bg-rule" name="rule" />
      <div className="grid grid-cols-1 gap-10 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <HomePart className="flex flex-col items-start gap-6" name="pitch">
          <h2
            className={`${HEADLINE_BOX} font-zuume type-display-md leading-none font-bold text-balance uppercase sm:type-display-lg`}
          >
            Your next film is waiting
          </h2>
          <p className="max-w-[46ch] type-base leading-7 text-ink-body">
            {members > 0
              ? `Join ${formatWhole(members)} members keeping a diary of what they watch.`
              : "Keep a diary of what you watch."}{" "}
            It’s free, and it takes a minute.
          </p>
          <Button
            className={`${PRIMARY} h-11 rounded-full px-6 type-body font-medium`}
            onClick={openSignIn}
          >
            Create your account
          </Button>
        </HomePart>
        <ul className="grid grid-cols-1 gap-5 self-center sm:grid-cols-2">
          {JOIN_POINTS.map((point, index) => (
            <HomePart
              as="li"
              className="flex items-start gap-3"
              index={index}
              key={point.text}
              name="point"
            >
              <span className="center mt-0.5 size-8 shrink-0 rounded-full bg-fill text-ink-body">
                <Icon icon={point.icon} size={16} />
              </span>
              <span className="type-copy text-ink-body">{point.text}</span>
            </HomePart>
          ))}
        </ul>
      </div>
    </HomeSection>
  );
}

function FollowButton({ member }: { member: HomeMember }): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [status, setStatus] = useState<MemberFollowState>(null);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (!auth.isAuthenticated) {
      openSignIn();
      return;
    }
    const was = status;
    setStatus(was ? null : "accepted");
    start(async () => {
      const result = was
        ? await unfollowUserAction(member.id, member.username)
        : await followUserAction(member.id, member.username);
      if (!result.success) {
        setStatus(was);
        toast(result.error);
        return;
      }
      const next: MemberFollowState = was
        ? null
        : (result.data as MemberFollowState);
      setStatus(next);
      globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
        followingId: member.id,
        status: next,
      });
    });
  };

  return (
    <Button
      aria-pressed={status !== null}
      className={cn(
        "h-8 w-full rounded-full px-4 type-control font-medium",
        status ? TONE.chosen : TONE.surface,
      )}
      disabled={pending}
      onClick={toggle}
    >
      {status === "pending" ? "Requested" : status ? "Following" : "Follow"}
    </Button>
  );
}

function MemberCard({
  index,
  member,
}: {
  index: number;
  member: HomeMember;
}): JSX.Element {
  const href = accountHref(member.username);
  return (
    <HomePart
      as="li"
      className="flex min-w-0 flex-col items-center gap-3 text-center"
      index={index}
      name="member"
    >
      <AccountLink
        className="flex ui-fade hover:opacity-80 focus-visible:opacity-80"
        href={href}
      >
        <Avatar
          className="rounded-full"
          name={member.displayName}
          size={72}
          src={member.avatarUrl ?? undefined}
        />
      </AccountLink>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        <AccountLink
          className={`truncate type-copy font-semibold text-ink ${TEXT_LINK_CLASS}`}
          href={href}
        >
          {member.displayName}
        </AccountLink>
        <span className="truncate type-meta text-ink-muted">
          @{member.username}
        </span>
      </div>
      <p className="line-clamp-2 min-h-8 type-meta text-ink-muted">
        {member.reason}
      </p>
      <p className="type-meta text-ink-muted tabular-nums">
        {formatCompact(member.watched)} films · {formatCompact(member.reviews)}{" "}
        reviews
      </p>
      <div className="mt-auto w-full max-w-36">
        <FollowButton member={member} />
      </div>
    </HomePart>
  );
}

export function HomeMembers({
  members,
  title,
}: {
  members: HomeMember[];
  title: string;
}): JSX.Element | null {
  if (members.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="members">
      <Heading icon="solar:user-plus-bold" title={title} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {members.map((member, index) => (
          <MemberCard index={index} key={member.id} member={member} />
        ))}
      </ul>
    </HomeSection>
  );
}

export function HomePulse({
  greeting,
  pulse,
}: {
  greeting: string | null;
  pulse: Pulse;
}): JSX.Element | null {
  if (pulse.members === 0) return null;
  const figures = [
    { label: "Films logged", value: pulse.logs },
    { label: "Different films", value: pulse.films },
    { label: "Reviews written", value: pulse.reviews },
    { label: "Members", value: pulse.members },
  ];
  return (
    <HomeSection className="flex w-full flex-col gap-5" cue="pulse">
      <HomePart className="flex flex-col gap-1" name="greeting">
        <h2 className="type-title font-semibold text-ink">
          {greeting ?? "This week on Guffin"}
        </h2>
        <p className="type-body text-ink-muted">
          {greeting
            ? "Here’s what your circle and the community have been watching."
            : "A film diary for people who love them. Here’s the last seven days."}
        </p>
      </HomePart>
      <div
        className={`grid grid-cols-2 divide-rule sm:grid-cols-4 sm:divide-x [&>div]:py-3 sm:[&>div]:px-6 sm:[&>div:first-child]:pl-0`}
      >
        {figures.map((figure, index) => (
          <div className="flex flex-col gap-1.5" key={figure.label}>
            <HomePart
              as="span"
              className={`${TONE.label} text-ink-muted`}
              index={index}
              name="figure"
            >
              {figure.label}
            </HomePart>
            <HomeCount
              className="font-zuume type-display-xs leading-none font-bold text-ink tabular-nums sm:type-display-sm"
              format={formatWhole}
              hover
              index={index}
              part="count"
              value={figure.value}
            />
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
