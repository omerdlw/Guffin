"use client";

import { useState, useTransition, type JSX } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@/ui/cn";
import {
  AccountLink,
  SOCIAL_EVENTS,
  followUserAction,
  unfollowUserAction,
} from "@/features/account";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { Header, Item, Section } from "@/motion/stage";
import { Avatar, Button, TONE } from "@/ui";
import { accountHref } from "@/config/routes";
import { compact } from "../format";
import type { HomeMember } from "../types";

type Status = "accepted" | "pending" | null;

function FollowButton({ member }: { member: HomeMember }): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const [status, setStatus] = useState<Status>(null);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (!auth.isAuthenticated) {
      void openSurface(
        createSignInSurfaceEntry({ next: window.location.pathname }),
      );
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
      const next: Status = was ? null : (result.data as Status);
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

function MemberCard({ member }: { member: HomeMember }): JSX.Element {
  const href = accountHref(member.username);
  return (
    <Item
      as="li"
      className="flex min-w-0 flex-col items-center gap-3 text-center"
      from="light"
    >
      <AccountLink className="flex ui-fade hover:opacity-80" href={href}>
        <Avatar
          className="rounded-full"
          name={member.displayName}
          size={72}
          src={member.avatarUrl ?? undefined}
        />
      </AccountLink>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        <AccountLink
          className="truncate type-copy font-semibold text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
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
        {compact(member.watched)} films · {compact(member.reviews)} reviews
      </p>
      <div className="mt-auto w-full max-w-36">
        <FollowButton member={member} />
      </div>
    </Item>
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
    <Section className="flex w-full flex-col">
      <Header icon="solar:user-plus-bold" title={title} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </ul>
    </Section>
  );
}
