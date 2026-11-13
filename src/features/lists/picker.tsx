"use client";

import {
  type FormEvent,
  type JSX,
  memo,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { pluralize } from "@/lib/format";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  Button,
  CheckboxIndicator,
  HighlightGroup,
  Image,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { cn, ui } from "@/design/ui";
import { SKELETON } from "@/design/components/skeleton";
import {
  rowVariants,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_END,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface-classes";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
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
import type {
  ListPickerData,
  ListPickerLibrary,
  MovieListSummary,
} from "./types";
import { previewPosters, stackCard } from "./utils";

export function createListPickerSurfaceEntry(
  data: ListPickerData,
): SurfaceEntry {
  return {
    component: ListPickerSurface,
    description:
      data.mediaType === "tv"
        ? "Choose the lists this show belongs to"
        : "Choose the lists this movie belongs to",
    icon: "solar:folder-open-bold",
    props: { data },
    title: "Your Lists",
  };
}

function PreviewCard({
  index,
  poster,
}: {
  index: number;
  poster: string | undefined;
}): JSX.Element {
  const src = poster ? tmdbImageUrl("poster", poster, "original") : null;

  return (
    <div
      className={cn(
        "absolute overflow-hidden",
        SURFACE_TILE_INNER,
        poster ? "bg-page ring-1 ring-inset ring-edge-hover" : "bg-fill-hover",
      )}
      style={stackCard(index)}
    >
      {!poster ? (
        <div className="center size-full text-ink-muted">
          <Icon icon="solar:folder-bold" size={18} />
        </div>
      ) : src ? (
        <Image
          alt=""
          className="size-full object-cover select-none pointer-events-none"
          decoding="async"
          loading="lazy"
          src={src}
          wrapperClassName="size-full bg-fill"
        />
      ) : (
        <div className="center size-full bg-fill text-ink-faint">
          <Icon icon="solar:filmstrip-bold" size={14} />
        </div>
      )}
    </div>
  );
}

const ListPreviewStack = memo(function ListPreviewStack({
  list,
}: {
  list: MovieListSummary;
}): JSX.Element {
  const posters = previewPosters(list).slice(0, PREVIEW_STACK);

  return (
    <div
      className="relative z-10 h-[60px] shrink-0 select-none"
      style={{ width: `${PREVIEW_STACK_WIDTH}px` }}
    >
      {Array.from({ length: Math.max(posters.length, 1) }, (_, index) => (
        <PreviewCard index={index} key={index} poster={posters[index]} />
      ))}
    </div>
  );
});

const ListRow = memo(function ListRow({
  inList,
  list,
  onToggle,
  pending,
}: {
  inList: boolean;
  list: MovieListSummary;
  onToggle: () => void;
  pending: boolean;
}): JSX.Element {
  const highlight = useHighlight(list.id);
  const detail = pluralize(list.itemsCount, "film");

  return (
    <Button
      aria-pressed={inList}
      className={rowVariants({
        className: "pr-[22px]",
        intent: inList ? "chosen" : "neutral",
      })}
      disabled={pending}
      onClick={onToggle}
      {...highlight.props}
    >
      {highlight.node}
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

      <CheckboxIndicator checked={inList} pending={pending} reveal />
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
            tileVariants(),
            SURFACE_TILE_END,
            "w-full",
            SKELETON.pulse,
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
            <div className={cn(SKELETON.block, "h-3.5 w-3/5 rounded-full")} />
            <div className={cn(SKELETON.soft, "h-2.5 w-2/5 rounded-full")} />
          </div>
          <div
            className={cn(
              SKELETON.soft,
              "size-6 shrink-0 rounded-full ring-1 ring-edge ring-inset",
            )}
          />
        </div>
      ))}
    </div>
  );
}

function PickerNote({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}): JSX.Element {
  return (
    <SurfacePart className={cn("center text-center", className)} name="note">
      {children}
    </SurfacePart>
  );
}

function ListShelf({
  library,
  onToggle,
  pending,
}: {
  library: ListPickerLibrary;
  onToggle: (list: MovieListSummary) => void;
  pending: ReadonlySet<string>;
}): JSX.Element {
  if (library.status === "loading") {
    return (
      <SurfacePart name="note">
        <LoadingListSkeleton />
      </SurfacePart>
    );
  }

  if (library.status === "error") {
    return (
      <PickerNote className="min-h-40 flex-col gap-1.5">
        <div className="center size-10 rounded-full bg-fill text-ink-muted">
          <Icon icon="solar:danger-circle-bold" size={20} />
        </div>
        <p className="type-body text-ink-body">
          Your lists could not be loaded
        </p>
      </PickerNote>
    );
  }

  if (library.lists.length === 0) {
    return (
      <PickerNote className="min-h-40 flex-col gap-2 py-6">
        <div className="center size-12 rounded-full bg-fill text-ink-faint ring-1 ring-edge-hover ring-inset">
          <Icon icon="solar:folder-open-bold" size={22} />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="type-body font-medium text-ink-body">No lists yet</p>
          <p className="type-meta text-ink-muted">
            Name one above to start it with this movie
          </p>
        </div>
      </PickerNote>
    );
  }

  return (
    <HighlightGroup className="flex flex-col gap-2.5">
      {library.lists.map((list, index) => (
        <SurfacePart index={index} key={list.id} name="row">
          <ListRow
            inList={library.memberships.has(list.id)}
            list={list}
            onToggle={() => onToggle(list)}
            pending={pending.has(list.id)}
          />
        </SurfacePart>
      ))}
    </HighlightGroup>
  );
}

function shelfKeyOf({ lists, status }: ListPickerLibrary): string {
  if (status !== "ready") return status;
  return lists.length === 0 ? "empty" : "rows";
}

function toggleMember(
  members: ReadonlySet<string>,
  id: string,
  present: boolean,
): Set<string> {
  const next = new Set(members);
  if (present) next.add(id);
  else next.delete(id);
  return next;
}

function ListPickerSurface({ data }: { data: ListPickerData }): JSX.Element {
  const toast = useToast();
  const movieId = data.movieId;
  const mediaType = data.mediaType ?? "movie";

  const [library, setLibrary] = useState<ListPickerLibrary>({
    lists: [],
    memberships: new Set(),
    status: "loading",
  });
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [draft, setDraft] = useState({ isPrivate: false, title: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMovieListsAction(movieId, mediaType)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setLibrary({
            lists: result.lists,
            memberships: new Set(result.memberships),
            status: "ready",
          });
        } else {
          setLibrary((current) => ({ ...current, status: "error" }));
          toast(result.error);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        report("ListPickerSurface load", error);
        setLibrary((current) => ({ ...current, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, movieId, toast]);

  const remember = (list: MovieListSummary, inList: boolean) =>
    setLibrary((current) => ({
      ...current,
      lists: current.lists.some((item) => item.id === list.id)
        ? current.lists.map((item) => (item.id === list.id ? list : item))
        : [list, ...current.lists],
      memberships: toggleMember(current.memberships, list.id, inList),
    }));

  async function toggle(list: MovieListSummary) {
    if (pending.has(list.id)) return;
    const active = !library.memberships.has(list.id);
    setPending((current) => toggleMember(current, list.id, true));
    try {
      const result = await setMovieListMembershipAction(
        movieId,
        list.id,
        active,
        mediaType,
      );
      if (result.success) remember(result.list, result.inList);
      else toast(result.error);
    } catch (error) {
      report("ListPickerSurface toggle", error);
      toast(toUserMessage(error, { fallback: "Could not update your list" }));
    } finally {
      setPending((current) => toggleMember(current, list.id, false));
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const name = draft.title.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const result = await createMovieListAction(
        movieId,
        name,
        draft.isPrivate,
        mediaType,
      );
      if (result.success) {
        remember(result.list, result.inList);
        setDraft((current) => ({ ...current, title: "" }));
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
              className={ui.parts.input.field({
                className: "h-10 min-w-0 flex-1 px-4 type-body",
              })}
              disabled={creating}
              maxLength={LIST_TITLE_MAX}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="New list"
              value={draft.title}
            />
            <Button
              aria-label={draft.isPrivate ? "Private list" : "Public list"}
              aria-pressed={draft.isPrivate}
              icon
              intent={draft.isPrivate ? "chosen" : "neutral"}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  isPrivate: !current.isPrivate,
                }))
              }
            >
              <Icon
                icon={
                  draft.isPrivate
                    ? "solar:lock-bold"
                    : "solar:lock-unlocked-linear"
                }
                size={16}
              />
            </Button>
            <Button
              aria-label="Create list and add this movie"
              intent="primary"
              icon
              disabled={!draft.title.trim()}
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
        >
          <SurfaceSwap cue="rows" id={shelfKeyOf(library)} now>
            <ListShelf
              library={library}
              onToggle={(list) => void toggle(list)}
              pending={pending}
            />
          </SurfaceSwap>
        </div>
      </div>
    </SurfaceStage>
  );
}
