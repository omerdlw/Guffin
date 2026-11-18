"use client";

import {
  type FormEvent,
  type JSX,
  memo,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import { Button, Image, Spinner } from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { ActionIcon } from "@/design/components/action-content";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { SKELETON } from "@/design/components/skeleton";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import {
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import { WELL, WELL_HOVER } from "@/design/foundations/tones";
import { variants } from "@/design/foundations/variants";
import { defineSurface } from "@/design/surface-definition";
import { cn, ui } from "@/design/ui";
import { pluralize } from "@/lib/format";
import { type MediaType, tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  createMovieListAction,
  getMovieListsAction,
  setMovieListMembershipAction,
} from "./actions";
import { LIST_TITLE_MAX, type MovieListSummary, previewPosters } from "./list";

interface ListPickerLibrary {
  lists: MovieListSummary[];
  memberships: ReadonlySet<string>;
  status: "error" | "loading" | "ready";
}

interface ListPickerData {
  mediaType?: MediaType;
  movieId: number;
}

const COVER_POSTERS = 3;

const LIST_GRID = "grid grid-cols-2 gap-2.5";

const listCardVariants = variants(
  "group relative isolate flex h-auto w-full cursor-pointer flex-col items-stretch justify-start gap-2 rounded-card p-1.5 pb-2.5 text-left select-none outline-none disabled:cursor-wait",
  {
    variants: {
      chosen: {
        false: `${WELL} ${WELL_HOVER} text-ink-body hover:text-ink focus-visible:text-ink`,
        true: `${WELL} text-ink ring-2 ring-grade ring-inset`,
      },
    },
    defaultVariants: { chosen: false },
  },
);

export const listPickerSurface = defineSurface<{ data: ListPickerData }>({
  component: ListPickerSurface,
  description: ({ data }) =>
    data.mediaType === "tv"
      ? "Choose the lists this show belongs to"
      : "Choose the lists this movie belongs to",
  icon: "solar:folder-open-bold",
  title: "Your Lists",
});

function ListCover({ list }: { list: MovieListSummary }): JSX.Element {
  const posters = previewPosters(list).slice(0, COVER_POSTERS);

  return (
    <span className="grid aspect-[2/1] w-full grid-cols-3 gap-px overflow-hidden rounded-inset bg-fill">
      {Array.from({ length: COVER_POSTERS }, (_, index) => {
        const src = tmdbImageUrl("poster", posters[index], "original");
        return src ? (
          <Image
            alt=""
            className="size-full object-cover select-none pointer-events-none"
            decoding="async"
            key={index}
            loading="lazy"
            src={src}
            wrapperClassName="size-full bg-fill"
          />
        ) : (
          <span className="center size-full bg-fill text-ink-faint" key={index}>
            {index === 1 && posters.length === 0 ? (
              <Icon icon="solar:folder-bold" size={18} />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

const ListCard = memo(function ListCard({
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
  return (
    <Button
      aria-busy={pending || undefined}
      aria-pressed={inList}
      className={listCardVariants({ chosen: inList })}
      disabled={pending}
      onClick={onToggle}
    >
      <span className="relative block w-full">
        <ListCover list={list} />
        {pending || inList ? (
          <span className="absolute top-1.5 right-1.5 center size-6 rounded-full bg-grade text-on-accent">
            {pending ? (
              <Spinner size={12} />
            ) : (
              <Icon icon="solar:check-read-linear" size={14} />
            )}
          </span>
        ) : null}
      </span>
      <span className="flex w-full min-w-0 flex-col px-1.5">
        <span className={SURFACE_TITLE}>{list.title}</span>
        <span className={cn(SURFACE_META, "flex items-center gap-1.5")}>
          {list.isPrivate ? <Icon icon="solar:lock-bold" size={12} /> : null}
          {pluralize(list.itemsCount, "film")}
        </span>
      </span>
    </Button>
  );
});

function LoadingListSkeleton(): JSX.Element {
  return (
    <div className={LIST_GRID}>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className={cn(
            listCardVariants(),
            "pointer-events-none",
            SKELETON.pulse,
          )}
          key={index}
        >
          <div className="aspect-[2/1] w-full rounded-inset bg-fill-hover" />
          <div className="flex flex-col gap-1.5 px-1.5">
            <div className={cn(SKELETON.block, "h-3.5 w-3/5 rounded-full")} />
            <div className={cn(SKELETON.soft, "h-2.5 w-2/5 rounded-full")} />
          </div>
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
    <div className={LIST_GRID}>
      {library.lists.map((list, index) => (
        <SurfacePart index={index} key={list.id} name="row">
          <ListCard
            inList={library.memberships.has(list.id)}
            list={list}
            onToggle={() => onToggle(list)}
            pending={pending.has(list.id)}
          />
        </SurfacePart>
      ))}
    </div>
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
                className: "h-control-md min-w-0 flex-1 px-4 type-body",
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
              <ActionIcon
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
