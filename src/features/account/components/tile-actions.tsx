"use client";

import { useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@/ui/cn";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { Button, Icon, useConfirmStep } from "@/ui";
import { setMovieLibraryAction } from "../server/library-actions";
import { setMovieListMembershipAction } from "@/features/lists";
import { setFavoriteAction } from "../server/browse-actions";

export type TileSource =
  | { kind: "likes" | "watched" | "watchlist" }
  | { kind: "list"; listId: string };

const LABEL: Record<TileSource["kind"], string> = {
  likes: "likes",
  list: "this list",
  watched: "watched",
  watchlist: "your watchlist",
};

export function TileActions({
  pinned = false,
  source,
  title,
  tmdbId,
}: {
  pinned?: boolean;
  source: TileSource;
  title: string;
  tmdbId: number;
}): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useConfirmStep();
  const [busy, startTransition] = useTransition();

  const run = (work: () => Promise<{ error?: string; success: boolean }>) =>
    startTransition(async () => {
      try {
        const result = await work();
        if (result.success) router.refresh();
        else toast(result.error ?? "Something went wrong");
      } catch (error) {
        report("TileActions", error);
        toast(toUserMessage(error, { fallback: "Something went wrong" }));
      }
      setConfirming(false);
    });

  const remove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    run(() => {
      switch (source.kind) {
        case "list":
          return setMovieListMembershipAction(tmdbId, source.listId, false);
        case "likes":
          return setMovieLibraryAction(tmdbId, "liked", false);
        default:
          return setMovieLibraryAction(
            tmdbId,
            source.kind === "watched" ? "watched" : "watchlist",
            false,
          );
      }
    });
  };

  const button =
    "center size-8 cursor-pointer rounded-thumb bg-black/70 text-ink-body ring-1 ring-edge-hover backdrop-blur-sm ring-inset hover:bg-black hover:text-ink disabled:cursor-wait";

  return (
    <div
      className={cn(
        "absolute top-2 right-2 z-10 flex gap-1.5 ui-fade",
        confirming || busy
          ? "opacity-100"
          : "opacity-0 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100",
      )}
    >
      {source.kind === "likes" ? (
        <Button
          aria-label={pinned ? `Unpin ${title}` : `Pin ${title} to favorites`}
          aria-pressed={pinned}
          className={cn(button, pinned && "text-rated")}
          disabled={busy}
          loading={busy && !confirming}
          onClick={() => run(() => setFavoriteAction(tmdbId, !pinned))}
        >
          <Icon
            icon={pinned ? "solar:star-bold" : "solar:star-linear"}
            size={15}
          />
        </Button>
      ) : null}
      <Button
        aria-label={
          confirming
            ? `Confirm removing ${title}`
            : `Remove ${title} from ${LABEL[source.kind]}`
        }
        className={cn(button, confirming && "bg-danger text-black ring-danger")}
        disabled={busy}
        loading={busy && confirming}
        onClick={remove}
      >
        <Icon
          icon={
            confirming
              ? "solar:check-read-linear"
              : "solar:trash-bin-trash-bold"
          }
          size={15}
        />
      </Button>
    </div>
  );
}
