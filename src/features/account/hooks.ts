"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { toUserMessage, UserError } from "@omerdlw/base-framework/utils";
import { followUserAction, unfollowUserAction } from "./actions";
import {
  acceptFollowRequest,
  fetchFollowRequests,
  rejectFollowRequest,
  removeFollower,
} from "./client";
import { SOCIAL_EVENTS } from "./constants";
import type {
  FollowUser,
  SocialAction,
  SocialActionPlan,
  SocialCollection,
  SocialCollectionController,
  SocialPageLoader,
} from "./types";
import { snapshotState, withoutUser } from "./utils";

export const loadRequests: SocialPageLoader = async () => ({
  items: await fetchFollowRequests(),
  next: null,
  total: null,
});

export function useCollection(
  load: SocialPageLoader,
  enabled: boolean,
): SocialCollectionController {
  const [state, setState] = useState<SocialCollection>({
    error: null,
    list: [],
    loading: enabled,
    loadingMore: false,
    next: null,
    total: null,
  });
  const requestId = useRef(0);
  const isLoadingMore = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setState((current) =>
        current.loading ? { ...current, loading: false } : current,
      );
      return;
    }
    const id = ++requestId.current;
    setState((current) => ({
      ...current,
      error: null,
      loading: current.list.length === 0,
    }));
    try {
      const page = await load();
      if (id !== requestId.current) return;
      setState({
        error: null,
        list: page.items,
        loading: false,
        loadingMore: false,
        next: page.next,
        total: page.total,
      });
    } catch (error) {
      if (id === requestId.current) {
        setState((current) => ({ ...current, error, loading: false }));
      }
    }
  }, [enabled, load]);

  const cursor = state.next;
  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore.current) return;
    isLoadingMore.current = true;
    const id = requestId.current;
    setState((current) => ({ ...current, loadingMore: true }));
    try {
      const page = await load(cursor);
      if (id !== requestId.current) return;
      setState((current) => {
        const known = new Set(current.list.map((user) => user.id));
        return {
          ...current,
          list: [
            ...current.list,
            ...page.items.filter((user) => !known.has(user.id)),
          ],
          loadingMore: false,
          next: page.next,
        };
      });
    } catch {
      setState((current) => ({ ...current, loadingMore: false }));
    } finally {
      isLoadingMore.current = false;
    }
  }, [cursor, load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loadMore, reload, setState, state };
}

export function useFollowStatuses(
  followers: FollowUser[],
  following: FollowUser[],
) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [seen, setSeen] = useState({ followers, following });

  if (seen.followers !== followers || seen.following !== following) {
    setSeen({ followers, following });
    setStatuses((current) => {
      const next = { ...current };
      for (const user of [...followers, ...following]) {
        next[user.id] = user.viewerStatus || "";
      }
      return next;
    });
  }

  return [statuses, setStatuses] as const;
}

export function useSocialActions({
  collections,
  ownProfile,
  setFollowStatus,
  viewerId,
}: {
  collections: Record<
    "followers" | "following" | "requests",
    SocialCollectionController
  >;
  ownProfile: boolean;
  setFollowStatus: Dispatch<SetStateAction<Record<string, string>>>;
  viewerId: string | null;
}) {
  const toast = useToast();
  const [pending, setPending] = useState<Record<string, SocialAction>>({});
  const setFollowers = collections.followers.setState;
  const setFollowing = collections.following.setState;
  const setRequests = collections.requests.setState;

  const planAction = useCallback(
    (action: SocialAction, id: string): SocialActionPlan => {
      switch (action) {
        case "accept":
          return {
            apply: () =>
              snapshotState(setRequests, (state) => withoutUser(state, id)),
            failure: "Couldn't accept this request",
            request: async () => {
              await acceptFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: "accepted",
              });
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
          };
        case "reject":
          return {
            apply: () =>
              snapshotState(setRequests, (state) => withoutUser(state, id)),
            failure: "Couldn't decline this request",
            request: async () => {
              await rejectFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
          };
        case "remove":
          return {
            apply: () =>
              snapshotState(setFollowers, (state) => withoutUser(state, id)),
            failure: "Couldn't remove this follower",
            request: async () => {
              await removeFollower(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: null,
              });
            },
          };
        case "unfollow":
          return {
            apply: () => {
              const revertStatus = snapshotState(
                setFollowStatus,
                ({ [id]: _, ...rest }) => rest,
              );
              const revertList = ownProfile
                ? snapshotState(setFollowing, (state) => withoutUser(state, id))
                : () => {};
              return () => {
                revertStatus();
                revertList();
              };
            },
            failure: "Couldn't unfollow this account",
            request: async () => {
              const result = await unfollowUserAction(id);
              if (!result.success) throw new UserError(result.error);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status: null,
              });
            },
          };
        case "follow":
          return {
            apply: () =>
              snapshotState(setFollowStatus, (statuses) => ({
                ...statuses,
                [id]: "accepted",
              })),
            failure: "Couldn't follow this account",
            request: async () => {
              const result = await followUserAction(id);
              if (!result.success) throw new UserError(result.error);
              setFollowStatus((statuses) => ({
                ...statuses,
                [id]: result.data,
              }));
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status: result.data,
              });
            },
          };
      }
    },
    [
      ownProfile,
      setFollowStatus,
      setFollowers,
      setFollowing,
      setRequests,
      viewerId,
    ],
  );

  const runAction = useCallback(
    async (action: SocialAction, id: string) => {
      if (!viewerId || pending[id]) return;
      const { apply, failure, request } = planAction(action, id);
      setPending((current) => ({ ...current, [id]: action }));
      const revert = apply();
      try {
        await request();
      } catch (error) {
        revert();
        toast(toUserMessage(error, { fallback: failure }));
      } finally {
        setPending(({ [id]: _, ...rest }) => rest);
      }
    },
    [pending, planAction, toast, viewerId],
  );

  return { pending, runAction };
}
