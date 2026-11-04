"use client";

import {
  type FormEvent,
  type JSX,
  memo,
  useEffect,
  useId,
  useState,
} from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { LayoutGroup } from "motion/react";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Loader } from "@/ui/feedback";
import { Input, SlidingHighlight } from "@/ui/form";
import { AdaptiveImage, Icon } from "@/ui/media";
import {
  scrollWithin,
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/ui/surface";
import {
  createMovieListAction,
  getMovieListsAction,
  setMovieListMembershipAction,
} from "./actions";
import {
  LIST_TITLE_MAX,
  PREVIEW_STACK,
  PREVIEW_STACK_WIDTH,
} from "./constants";
import type { ListPickerData, MovieListSummary } from "./types";
import { stackCard } from "./utils";
import {
  SURFACE_CHECK_ON,
  SURFACE_FIELD,
  SURFACE_META,
  SURFACE_PRIMARY,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_END,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  surfaceIconButton,
  surfaceRow,
} from "@/ui/tokens";

export function createListPickerSurfaceEntry(
  data: ListPickerData,
): SurfaceEntry {
  return {
    component: ListPickerSurface,
    description: "Choose the lists this movie belongs to",
    icon: "solar:folder-open-bold",
    props: { data },
    title: "Your Lists",
  };
}

const ListPreviewStack = memo(function ListPreviewStack({
  list,
}: {
  list: MovieListSummary;
}): JSX.Element {
  const previews = (
    list.previewPosters && list.previewPosters.length > 0
      ? list.previewPosters
      : list.posterPath
        ? [list.posterPath]
        : []
  )
    .filter(Boolean)
    .slice(0, PREVIEW_STACK);

  return (
    <div
      className="relative z-10 h-[60px] shrink-0 select-none"
      style={{ width: `${PREVIEW_STACK_WIDTH}px` }}
    >
      {Array.from({ length: Math.max(previews.length, 1) }, (_, index) => {
        const poster = previews[index];
        const imageSrc = poster
          ? tmdbImageUrl("poster", poster, "original")
          : null;
        const hasCard = Boolean(poster);

        return (
          <div
            key={index}
            className={cn(
              "absolute overflow-hidden",
              SURFACE_TILE_INNER,
              hasCard
                ? "bg-black ring-1 ring-inset ring-edge-hover"
                : "bg-fill-hover",
            )}
            style={stackCard(index)}
          >
            {hasCard ? (
              imageSrc ? (
                <AdaptiveImage
                  alt=""
                  className="size-full object-cover select-none pointer-events-none"
                  decoding="async"
                  loading="lazy"
                  src={imageSrc}
                  wrapperClassName="size-full bg-fill"
                />
              ) : (
                <div className="center size-full bg-fill text-ink-faint">
                  <Icon icon="solar:filmstrip-bold" size={14} />
                </div>
              )
            ) : (
              <div className="center size-full text-ink-muted">
                <Icon icon="solar:folder-bold" size={18} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

const ListRow = memo(function ListRow({
  inList,
  highlighted,
  list,
  onFocus,
  onPointerEnter,
  onToggle,
  pending,
}: {
  inList: boolean;
  highlighted: boolean;
  list: MovieListSummary;
  onFocus: () => void;
  onPointerEnter: () => void;
  onToggle: () => void;
  pending: boolean;
}): JSX.Element {
  const detail = `${list.itemsCount} ${list.itemsCount === 1 ? "film" : "films"}`;

  return (
    <Button
      aria-pressed={inList}
      className={surfaceRow(inList)}
      disabled={pending}
      onClick={onToggle}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
    >
      {highlighted ? (
        <SlidingHighlight layoutId="list-picker-highlight" />
      ) : null}
      <ListPreviewStack list={list} />

      <div className={cn(SURFACE_TEXT, "relative z-10")}>
        <p className={SURFACE_TITLE}>{list.title}</p>
        {list.description ? (
          <p className={cn(SURFACE_META, "text-ink-body")}>
            {list.description}
          </p>
        ) : null}
        <p className={cn(SURFACE_META, "flex items-center gap-1.5")}>
          {list.isPrivate ? (
            <>
              <Icon icon="solar:lock-bold" size={12} />
              <span>Private</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span>{detail}</span>
        </p>
      </div>

      <span
        className={cn(
          "center relative z-10 size-6 shrink-0 rounded-full ring-1 ring-inset",
          inList
            ? SURFACE_CHECK_ON
            : "text-transparent ring-edge-hover group-hover:text-ink-faint group-focus-visible:text-ink-faint group-has-focus-visible:text-ink-faint group-hover:ring-edge-focus group-focus-visible:ring-edge-focus group-has-focus-visible:ring-edge-focus",
        )}
      >
        {pending ? (
          <Loader />
        ) : (
          <Icon
            className={cn(
              "ui-glyph center",
              inList ? "scale-100" : "scale-75 group-hover:scale-90",
            )}
            icon="material-symbols:check-rounded"
            size={16}
          />
        )}
      </span>
    </Button>
  );
});

function LoadingListSkeleton(): JSX.Element {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className={cn(
            SURFACE_TILE,
            SURFACE_TILE_END,
            "w-full animate-skeleton-pulse",
          )}
        >
          <div
            className="relative h-[60px] shrink-0"
            style={{ width: `${PREVIEW_STACK_WIDTH}px` }}
          >
            {Array.from({ length: PREVIEW_STACK }, (_, stackIndex) => (
              <div
                key={stackIndex}
                className={cn(
                  "absolute overflow-hidden bg-fill-hover ring-1 ring-edge ring-inset",
                  SURFACE_TILE_INNER,
                )}
                style={{
                  ...stackCard(stackIndex),
                  opacity: 1 - stackIndex * 0.22,
                }}
              />
            ))}
          </div>
          <div className={SURFACE_TEXT}>
            <div className="skeleton-block h-3.5 w-3/5 rounded-full" />
            <div className="skeleton-block-soft h-2.5 w-2/5 rounded-full" />
          </div>
          <div className="skeleton-block-soft size-6 shrink-0 rounded-full ring-1 ring-edge ring-inset" />
        </div>
      ))}
    </div>
  );
}

function ListPickerSurface({ data }: { data: ListPickerData }): JSX.Element {
  const toast = useToast();
  const movieId = data.movieId;
  const highlightGroupId = useId();

  const [lists, setLists] = useState<MovieListSummary[]>([]);
  const [inLists, setInLists] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hoveredList, setHoveredList] = useState<string | null>(null);
  const [focusedList, setFocusedList] = useState<string | null>(null);
  const activeList = hoveredList ?? focusedList;

  useEffect(() => {
    let cancelled = false;
    getMovieListsAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setLists(result.lists);
          setInLists(new Set(result.memberships));
          setStatus("ready");
        } else {
          setStatus("error");
          toast(result.error);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        report("ListPickerSurface load", error);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, toast]);

  const shelf =
    status !== "ready" ? status : lists.length === 0 ? "empty" : "rows";

  const mark = (listId: string, on: boolean) =>
    setPending((current) => {
      const next = new Set(current);
      if (on) next.add(listId);
      else next.delete(listId);
      return next;
    });

  const remember = (list: MovieListSummary, inList: boolean) => {
    setLists((current) =>
      current.some((item) => item.id === list.id)
        ? current.map((item) => (item.id === list.id ? list : item))
        : [list, ...current],
    );
    setInLists((current) => {
      const next = new Set(current);
      if (inList) next.add(list.id);
      else next.delete(list.id);
      return next;
    });
  };

  async function toggle(list: MovieListSummary) {
    if (pending.has(list.id)) return;
    const active = !inLists.has(list.id);
    mark(list.id, true);
    try {
      const result = await setMovieListMembershipAction(
        movieId,
        list.id,
        active,
      );
      if (result.success) remember(result.list, result.inList);
      else toast(result.error);
    } catch (error) {
      report("ListPickerSurface toggle", error);
      toast(toUserMessage(error, { fallback: "Could not update your list" }));
    } finally {
      mark(list.id, false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const result = await createMovieListAction(movieId, name, isPrivate);
      if (result.success) {
        remember(result.list, result.inList);
        setTitle("");
      } else {
        toast(result.error);
      }
    } catch (error) {
      report("ListPickerSurface create", error);
      toast(toUserMessage(error, { fallback: "Could not create your list" }));
    } finally {
      setCreating(false);
    }
  }

  return (
    <SurfaceStage>
      <div className={SURFACE_STACK}>
        <SurfacePart name="item">
          <form className="flex items-center gap-2.5" onSubmit={create}>
            <Input
              aria-label="New list name"
              className={`${SURFACE_FIELD} h-10 min-w-0 flex-1 px-4 type-body`}
              disabled={creating}
              maxLength={LIST_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="New list"
              value={title}
            />
            <Button
              aria-label={isPrivate ? "Private list" : "Public list"}
              aria-pressed={isPrivate}
              className={surfaceIconButton(isPrivate)}
              onClick={() => setIsPrivate((current) => !current)}
            >
              <Icon
                icon={
                  isPrivate ? "solar:lock-bold" : "solar:lock-unlocked-linear"
                }
                size={16}
              />
            </Button>
            <Button
              aria-label="Create list and add this movie"
              className={cn(SURFACE_PRIMARY, "size-10 shrink-0 px-0")}
              disabled={!title.trim()}
              loading={creating}
              type="submit"
            >
              <Icon icon="solar:add-circle-bold" size={18} />
            </Button>
          </form>
        </SurfacePart>

        <div
          className={cn(
            SURFACE_SCROLL,
            "flex max-h-[min(56dvh,26rem)] flex-col",
          )}
          data-scroll-native
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              setFocusedList(null);
            }
          }}
          onPointerLeave={() => setHoveredList(null)}
          onWheel={scrollWithin}
        >
          <SurfaceSwap cue="rows" id={shelf} now>
            {shelf === "loading" ? (
              <SurfacePart name="note">
                <LoadingListSkeleton />
              </SurfacePart>
            ) : shelf === "error" ? (
              <SurfacePart
                className="center min-h-40 flex-col gap-1.5 text-center"
                name="note"
              >
                <div className="center size-10 rounded-full bg-fill text-ink-muted">
                  <Icon icon="solar:danger-circle-bold" size={20} />
                </div>
                <p className="type-body text-ink-body">
                  Your lists could not be loaded
                </p>
              </SurfacePart>
            ) : shelf === "empty" ? (
              <SurfacePart
                className="center min-h-40 flex-col gap-2 py-6 text-center"
                name="note"
              >
                <div className="center size-12 rounded-full bg-fill text-ink-faint ring-1 ring-edge-hover ring-inset">
                  <Icon icon="solar:folder-open-bold" size={22} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="type-body font-medium text-ink-body">
                    No lists yet
                  </p>
                  <p className="type-meta text-ink-muted">
                    Name one above to start it with this movie
                  </p>
                </div>
              </SurfacePart>
            ) : (
              <LayoutGroup id={`list-picker-${highlightGroupId}`}>
                <div className="flex flex-col gap-2.5">
                  {lists.map((list, index) => (
                    <SurfacePart index={index} key={list.id} name="row">
                      <ListRow
                        highlighted={activeList === list.id}
                        inList={inLists.has(list.id)}
                        list={list}
                        onFocus={() => setFocusedList(list.id)}
                        onPointerEnter={() => setHoveredList(list.id)}
                        onToggle={() => void toggle(list)}
                        pending={pending.has(list.id)}
                      />
                    </SurfacePart>
                  ))}
                </div>
              </LayoutGroup>
            )}
          </SurfaceSwap>
        </div>
      </div>
    </SurfaceStage>
  );
}
