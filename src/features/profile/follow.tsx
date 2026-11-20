"use client";

import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  report,
  toUserMessage,
  UserError,
} from "@omerdlw/base-framework/utils";
import { useDockCommands } from "@/design/dock-commands";
import { type PublicAccount, SOCIAL_EVENTS } from "@/features/account/account";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/social/actions";
import { getFollowState } from "@/features/social/client";

type FollowStatus = "accepted" | "pending" | null;

const FOLLOW_ORDER = 10;

const PENDING_POLL_MS = 15_000;

const asStatus = (value: string | null | undefined): FollowStatus =>
  value === "accepted" || value === "pending" ? value : null;

function buttonOf(
  status: FollowStatus,
  busy: boolean,
  username: string,
): { icon: string; tooltip: string } {
  if (busy) {
    return { icon: "svg-spinners:90-ring-with-bg", tooltip: "Updating..." };
  }
  if (status === "accepted") {
    return { icon: "solar:user-minus-bold", tooltip: `Unfollow @${username}` };
  }
  if (status === "pending") {
    return {
      icon: "solar:user-hand-up-bold",
      tooltip: "Requested · cancel request",
    };
  }
  return { icon: "solar:user-plus-bold", tooltip: `Follow @${username}` };
}

export function useProfileFollow({
  account,
  enabled,
}: {
  account: PublicAccount;
  enabled: boolean;
}): void {
  const { id, isPrivate, username } = account;
  const auth = useAuth();
  const signedIn = auth.isAuthenticated;
  const active = enabled && signedIn;
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [status, setStatus] = useState<FollowStatus>(null);
  const [busy, setBusy] = useState(false);
  const ticket = useRef(0);
  const writing = useRef(false);

  const read = useCallback(() => {
    if (!active || writing.current) return;
    const mine = ++ticket.current;
    void getFollowState(id).then(
      (next) => {
        if (mine === ticket.current) setStatus(asStatus(next));
      },
      () => null,
    );
  }, [active, id]);

  useEffect(() => {
    ticket.current += 1;
    setStatus(null);
    read();
  }, [read]);

  useEffect(() => {
    if (!active) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") read();
    };
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, read]);

  useEffect(() => {
    if (!active || status !== "pending") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") read();
    }, PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, read, status]);

  useGlobalEvent(active ? SOCIAL_EVENTS.NOTIFICATION_CHANGE : null, read, {
    debounceMs: 150,
  });

  useGlobalEvent(active ? SOCIAL_EVENTS.FOLLOW_CHANGE : null, (payload) => {
    if (payload.followingId !== id || writing.current) return;
    ticket.current += 1;
    setStatus(asStatus(payload.status));
  });

  const toggle = useCallback(
    async (event?: SyntheticEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (!signedIn) {
        openSignIn();
        return;
      }
      if (writing.current) return;

      const previous = status;
      const following = previous !== null;
      const mine = ++ticket.current;
      writing.current = true;
      setBusy(true);
      setStatus(following ? null : isPrivate ? "pending" : "accepted");

      let settled: FollowStatus = previous;
      try {
        const result = following
          ? await unfollowUserAction(id, username)
          : await followUserAction(id, username);
        if (!result.success) throw new UserError(result.error);
        settled = asStatus(result.data);
      } catch (error) {
        report("Social follow status", error);
        toast(toUserMessage(error, { fallback: "Follow action failed" }));
      } finally {
        writing.current = false;
        setBusy(false);
        if (mine === ticket.current) setStatus(settled);
      }
      if (settled !== previous) {
        globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
          followingId: id,
          status: settled,
        });
      }
    },
    [id, isPrivate, openSignIn, signedIn, status, toast, username],
  );

  const commands = useMemo(
    () => [
      {
        ...buttonOf(status, busy, username),
        disabled: busy,
        key: "social.follow",
        onClick: (event?: SyntheticEvent) => void toggle(event),
        order: FOLLOW_ORDER,
        visible: enabled,
      },
    ],
    [busy, enabled, status, toggle, username],
  );

  useDockCommands(commands);
}
