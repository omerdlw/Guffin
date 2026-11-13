"use client";

import { type JSX, useState, useTransition } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/account/actions";
import { SOCIAL_EVENTS } from "@/features/account/constants";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { accountHref } from "@/lib/project";
import { Avatar, Button } from "@omerdlw/base-framework/ui";
import { DockLink } from "@/design/components/link";
import { TEXT_LINK_CLASS } from "./constants";
import { Heading, HomePart, HomeSection } from "./motion";
import type { HomeMember, MemberFollowState } from "./types";
import { formatCompact } from "./utils";

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
