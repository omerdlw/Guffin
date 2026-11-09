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
import { Avatar } from "@/design/components/avatar";
import { Button } from "@/design/components/button";
import { DockLink } from "@/design/components/link";
import { HEADLINE_BOX } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { JOIN_POINTS, TEXT_LINK_CLASS } from "./constants";
import { Heading, HomeCount, HomePart, HomeSection, HomeText } from "./motion";
import type { MemberFollowState, HomeMember, Pulse } from "./types";
import { formatCompact, formatWhole } from "./utils";

export function HomeJoin({ members }: { members: number }): JSX.Element | null {
  const auth = useAuth();
  const openSignIn = useOpenSignIn();
  if (auth.isAuthenticated) return null;

  return (
    <HomeSection className="flex w-full flex-col" cue="join">
      <HomePart className="h-px w-full bg-line" name="rule" />
      <div className="grid grid-cols-1 gap-12 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
        <HomePart className="flex flex-col items-start gap-7" name="pitch">
          <p className={`${TONE.label} text-ink-muted`}>The end. Or yours.</p>
          <h2
            className={`${HEADLINE_BOX} font-zuume type-display-lg leading-none font-bold text-balance uppercase sm:type-display-xl lg:type-display-2xl`}
          >
            Your next film is waiting
          </h2>
          <p className="max-w-[46ch] type-base leading-7 text-ink-body">
            {members > 0
              ? `Join ${formatWhole(members)} members keeping a diary of what they watch.`
              : "Keep a diary of what you watch."}{" "}
            It’s free, and it takes a minute.
          </p>
          <Button intent="primary" shape="pill" size="lg" onClick={openSignIn}>
            Create your account
          </Button>
        </HomePart>
        <ul className={`flex flex-col self-end divide-y ${TONE.rules}`}>
          {JOIN_POINTS.map((point, index) => (
            <HomePart
              as="li"
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-5 first:pt-0"
              index={index}
              key={point.role}
              name="point"
            >
              <span className={`${TONE.label} text-ink-muted`}>
                {point.role}
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
      intent={status ? "chosen" : "neutral"}
      shape="pill"
      size="sm"
      width="full"
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
      <DockLink
        className="flex ui-fade hover:opacity-80 focus-visible:opacity-80"
        href={href}
      >
        <Avatar
          className="rounded-full"
          name={member.displayName}
          size={72}
          src={member.avatarUrl ?? undefined}
        />
      </DockLink>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        <DockLink
          className={`truncate type-copy font-semibold text-ink ${TEXT_LINK_CLASS}`}
          href={href}
        >
          {member.displayName}
        </DockLink>
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
      <Heading title={title} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {members.map((member, index) => (
          <MemberCard index={index} key={member.id} member={member} />
        ))}
      </ul>
    </HomeSection>
  );
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * The week as one sentence set in the display face: the numbers are the
 * brightest thing in it, and they count up as the sentence is read.
 */
export function HomePulse({
  greeting,
  pulse,
}: {
  greeting: string | null;
  pulse: Pulse;
}): JSX.Element | null {
  if (pulse.members === 0) return null;

  const figure = (value: number, index: number) => (
    <HomeCount
      className="text-ink tabular-nums"
      format={formatWhole}
      hover
      index={index}
      part="count"
      value={value}
    />
  );
  const words = (text: string) => (
    <HomeText as="span" by="word" part="statement" text={text} />
  );

  return (
    <HomeSection className="flex w-full flex-col gap-6" cue="statement">
      <HomePart as="p" className={`${TONE.label} text-ink-muted`} name="figure">
        {greeting ?? "This week on Guffin"}
      </HomePart>
      <p className="max-w-5xl font-zuume type-display-xs leading-none font-bold text-balance text-ink-muted uppercase sm:type-display-sm lg:type-display-md">
        {figure(pulse.members, 0)}{" "}
        {words(`${plural(pulse.members, "member", "members")} logged`)}{" "}
        {figure(pulse.logs, 1)}{" "}
        {words(`${plural(pulse.logs, "film,", "films,")}`)}{" "}
        {figure(pulse.films, 2)} {words("of them different, and wrote")}{" "}
        {figure(pulse.reviews, 3)}{" "}
        {words(plural(pulse.reviews, "review.", "reviews."))}
      </p>
    </HomeSection>
  );
}
