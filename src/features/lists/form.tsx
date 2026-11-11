"use client";

import { type FormEvent, type JSX, useState } from "react";
import {
  type SurfaceEntry,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { accountHref, listHref } from "@/lib/project";
import { Button } from "@/design/components/button";
import {
  HighlightGroup,
  useHighlight,
  useHighlightReset,
} from "@/design/components/highlight-group";
import { Icon } from "@/design/components/icon";
import { Input, inputVariants, Textarea } from "@/design/components/input";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  SurfacePart,
  SurfaceStage,
} from "@/design/components/surface";
import { Switch } from "@/design/components/switch";
import { cn } from "@/design/foundations/cn";
import { deleteListAction, saveListAction } from "./actions";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TILE_CLASS,
  LIST_TITLE_MAX,
} from "./constants";
import { useConfirm } from "@/design/hooks/use-confirm";
import { createListOrderSurfaceEntry } from "./order";
import type { ListDraft, ListFormData } from "./types";

export function createListFormSurfaceEntry(data: ListFormData): SurfaceEntry {
  return {
    component: ListFormSurface,
    description: data.list ? "Change this list" : "Name it and make it yours",
    icon: data.list ? "solar:pen-bold" : "solar:add-circle-bold",
    props: { data },
    title: data.list ? "Edit List" : "New List",
  };
}

function TileMark({ icon }: { icon: string }): JSX.Element {
  return (
    <span
      className={cn(
        "center relative z-10 size-10 shrink-0 bg-fill text-ink-body group-hover:bg-fill-hover group-focus-visible:bg-fill-hover group-has-focus-visible:bg-fill-hover group-hover:text-ink group-focus-visible:text-ink group-has-focus-visible:text-ink",
        SURFACE_TILE_INNER,
      )}
    >
      <Icon className="ui-glyph center" icon={icon} size={18} />
    </span>
  );
}

function TileText({
  description,
  label,
}: {
  description: string;
  label: string;
}): JSX.Element {
  return (
    <span className={cn(SURFACE_TEXT, "relative z-10")}>
      <span className={SURFACE_TITLE}>{label}</span>
      <span className={SURFACE_META}>{description}</span>
    </span>
  );
}

function Toggle({
  checked,
  description,
  disabled,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  icon: string;
  label: string;
  onChange: (value: boolean) => void;
}): JSX.Element {
  const highlight = useHighlight(label, "-z-10 rounded-card bg-fill");

  return (
    <label
      className={cn(LIST_TILE_CLASS, "cursor-pointer")}
      {...highlight.props}
    >
      {highlight.node}
      <TileMark icon={icon} />
      <TileText description={description} label={label} />
      <span className="relative z-10">
        <Switch
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </span>
    </label>
  );
}

function FilmOrderLink({
  disabled,
  onOpen,
}: {
  disabled: boolean;
  onOpen: () => void;
}): JSX.Element {
  const highlight = useHighlight("film-order");

  return (
    <Button
      className={cn(
        LIST_TILE_CLASS,
        "w-full cursor-pointer outline-none disabled:cursor-wait",
      )}
      disabled={disabled}
      onClick={onOpen}
      type="button"
      {...highlight.props}
    >
      {highlight.node}
      <TileMark icon="solar:sort-vertical-bold" />
      <TileText
        description="Drag the films into the order you keep them"
        label="Film order"
      />
      <Icon
        className="center relative z-10 shrink-0 text-ink-muted group-hover:translate-x-0.5 group-hover:text-ink-body group-focus-visible:text-ink-body group-has-focus-visible:text-ink-body"
        icon="solar:alt-arrow-right-linear"
        size={16}
      />
    </Button>
  );
}

function ListFormSurface({ data }: { data: ListFormData }): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { closeSurface, navigate, openSurface } = useDockActions();
  const resetHighlight = useHighlightReset();
  const list = data.list;

  const [draft, setDraft] = useState<ListDraft>({
    description: list?.description ?? "",
    isPrivate: list?.isPrivate ?? false,
    isRanked: list?.isRanked ?? false,
    title: list?.title ?? "",
  });
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const confirm = useConfirm();

  const updateDraft = (patch: Partial<ListDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || busy) return;
    setBusy("save");
    try {
      const result = await saveListAction(
        list?.id ?? null,
        draft,
        data.mediaType ?? "movie",
      );
      if (!result.success) {
        toast(result.error);
        return;
      }
      closeSurface?.();
      if (list) router.refresh();
      else void navigate(listHref(data.username, result.slug));
    } catch (error) {
      report("ListFormSurface save", error);
      toast(toUserMessage(error, { fallback: "Could not save your list" }));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!list || busy) return;
    const yes = await confirm({
      description: "The list and its order are removed for good",
      title: `Delete ${list.title}?`,
    });
    if (!yes) return;
    setBusy("delete");
    try {
      const result = await deleteListAction(list.id);
      if (!result.success) {
        toast(result.error);
        return;
      }
      closeSurface?.();
      void navigate(`${accountHref(data.username)}/lists`);
    } catch (error) {
      report("ListFormSurface delete", error);
      toast(toUserMessage(error, { fallback: "Could not delete this list" }));
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;
  const canOrder = list !== undefined && (list.itemsCount ?? 0) > 1;

  return (
    <SurfaceStage>
      <form onSubmit={save}>
        <HighlightGroup>
          <div className={SURFACE_STACK}>
            <SurfacePart name="item">
              <Input
                aria-label="List name"
                className={cn(inputVariants(), "h-10 w-full px-4 type-body")}
                disabled={disabled}
                maxLength={LIST_TITLE_MAX}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="List name"
                value={draft.title}
                {...resetHighlight}
              />
            </SurfacePart>
            <SurfacePart name="item">
              <Textarea
                aria-label="Description"
                className={cn(
                  inputVariants(),
                  "w-full px-4 py-3 type-body leading-6",
                )}
                disabled={disabled}
                maxHeight={180}
                maxLength={LIST_DESCRIPTION_MAX}
                minHeight={96}
                onChange={(event) =>
                  updateDraft({ description: event.target.value })
                }
                placeholder="What is this list about? (optional)"
                value={draft.description}
                {...resetHighlight}
              />
            </SurfacePart>
            <SurfacePart name="item">
              <Toggle
                checked={draft.isRanked}
                description="Number the films in the order you keep them"
                disabled={disabled}
                icon="solar:ranking-bold"
                label="Ranked"
                onChange={(isRanked) => updateDraft({ isRanked })}
              />
            </SurfacePart>
            <SurfacePart name="item">
              <Toggle
                checked={draft.isPrivate}
                description="Only you see it, and it stays out of your activity"
                disabled={disabled}
                icon="solar:lock-keyhole-bold"
                label="Private"
                onChange={(isPrivate) => updateDraft({ isPrivate })}
              />
            </SurfacePart>
            {canOrder ? (
              <SurfacePart name="item">
                <FilmOrderLink
                  disabled={disabled}
                  onOpen={() =>
                    void openSurface?.(
                      createListOrderSurfaceEntry({
                        listId: list.id,
                        title: list.title,
                      }),
                    )
                  }
                />
              </SurfacePart>
            ) : null}

            <SurfacePart className="flex items-center gap-2.5" name="item">
              {list ? (
                <Button
                  intent="neutral"
                  width="fill"
                  disabled={disabled}
                  loading={busy === "delete"}
                  onClick={() => void remove()}
                  {...resetHighlight}
                >
                  <Icon icon="solar:trash-bin-trash-bold" size={15} />
                  Delete
                </Button>
              ) : null}
              <Button
                intent="primary"
                width="fill"
                disabled={!draft.title.trim() || disabled}
                loading={busy === "save"}
                type="submit"
                {...resetHighlight}
              >
                {list ? "Save" : "Create list"}
              </Button>
            </SurfacePart>
          </div>
        </HighlightGroup>
      </form>
    </SurfaceStage>
  );
}
