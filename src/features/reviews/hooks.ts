"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { createSignInSurfaceEntry } from "@/features/auth";

export function useLikeToggle({
  count: initialCount,
  liked: initialLiked,
  name,
  save,
  signedIn,
}: {
  count: number;
  liked: boolean;
  name: string;
  save: (liked: boolean) => Promise<{ error?: string; success: boolean }>;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const [busy, startTransition] = useTransition();
  // Kept here and not as an optimistic overlay on the props: a review's likes
  // are fetched on the client, so no refresh hands down new props and an
  // overlay would fall back to the old count once the transition ends. When
  // new props do arrive they replace whatever is held.
  const [seen, setSeen] = useState({
    count: initialCount,
    liked: initialLiked,
  });
  const [{ count, liked }, setState] = useState(seen);
  if (seen.count !== initialCount || seen.liked !== initialLiked) {
    const props = { count: initialCount, liked: initialLiked };
    setSeen(props);
    setState(props);
  }

  const toggle = () => {
    if (!signedIn) {
      void openSurface(
        createSignInSurfaceEntry({
          next: window.location.pathname + window.location.search,
        }),
      );
      return;
    }
    const previous = { count, liked };
    const next = !liked;
    setState({ count: Math.max(0, count + (next ? 1 : -1)), liked: next });
    startTransition(async () => {
      try {
        const result = await save(next);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        setState(previous);
        report(name, error);
        toast(toUserMessage(error, { fallback: "Could not update your like" }));
      }
    });
  };

  return { busy, count, liked, toggle };
}
