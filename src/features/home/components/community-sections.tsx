"use client";

import { type JSX, useState, useTransition } from "react";
import { Avatar, Button } from "@omerdlw/base-framework/ui";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/notification";
import { DockLink } from "@/design/components/link";
import { Icon } from "@/design/components/icon";
import { SOCIAL_EVENTS } from "@/features/account/model";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { PosterStack } from "@/features/lists/components/poster-stack";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/social/actions";
import { accountHref, listHref } from "@/shared/site";
import {
  type HomeList,
  type HomeMember,
  LIST_LIMIT,
  TEXT_LINK_CLASS,
} from "../model";
import { formatCompact } from "@/shared/format";
import { Heading, HomePart, HomeSection } from "../motion";
import { MemberLink } from "./primitives";

function ListCard({
  index,
  list,
}: {
  index: number;
  list: HomeList;
}): JSX.Element {
  const href = listHref(list.owner.username, list.slug);
  return (
    <HomePart
      as="li"
      className="flex min-w-0 flex-col gap-4"
      index={index}
      name="list"
    >
      <DockLink
        aria-label={list.title}
        data-cursor-fit="snug"
        className="block ui-fade hover:opacity-80"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </DockLink>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="min-w-0 truncate type-title font-semibold text-ink">
          <DockLink className={TEXT_LINK_CLASS} href={href}>
            {list.title}
          </DockLink>
        </h3>
        {list.description ? (
          <p className="line-clamp-2 type-body text-pretty text-ink-muted">
            {list.description}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center gap-x-4 type-control text-ink-muted tabular-nums">
        <MemberLink member={list.owner} />
        <span className="shrink-0">{list.films} films</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Icon icon="solar:heart-bold" size={13} />
          {formatCompact(list.likes)}
        </span>
      </div>
    </HomePart>
  );
}

export function HomeLists({
  lists,
}: {
  lists: HomeList[];
}): JSX.Element | null {
  if (lists.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="lists">
      <Heading title="Popular lists" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {lists.slice(0, LIST_LIMIT).map((list, index) => (
          <ListCard index={index} key={list.id} list={list} />
        ))}
      </ul>
    </HomeSection>
  );
}

type MemberFollowState = "accepted" | "pending" | null;

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
      const next: MemberFollowState = result.status;
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
      <DockLink className="flex ui-fade hover:opacity-80" href={href}>
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
