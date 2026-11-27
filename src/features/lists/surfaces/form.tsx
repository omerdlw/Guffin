"use client";

import { type FormEvent, type JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  Button,
  HighlightGroup,
  Textarea,
  useHighlight,
  useHighlightReset,
} from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useConfirm } from "@/design/components/confirm";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { Switch } from "@/design/components/switch";
import { WELL, WELL_HOVER } from "@/design/foundations/tones";
import {
  SURFACE_META,
  SURFACE_PANEL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_END,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/surface/classes";
import { defineSurface } from "@/design/surface/define";
import { useSurfacePreload } from "@/design/surface/lazy";
import { SurfacePart, SurfaceStage } from "@/design/surface/surface";
import { cn } from "@/design/ui";
import { accountHref, listHref } from "@/shared/site";
import { deleteListAction, saveListAction } from "../actions";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
  type ListDraft,
  type ListFormData,
} from "../model";
import { listOrderSurface } from "./";

const LIST_TILE_CLASS = cn(
  tileVariants(),
  SURFACE_TILE_END,
  "group relative isolate select-none",
);

export const listFormSurface = defineSurface<{ data: ListFormData }>({
  component: ListFormSurface,
  description: ({ data }) =>
    data.list ? "Change this list" : "Name it and make it yours",
  icon: ({ data }) => (data.list ? "solar:pen-bold" : "solar:add-circle-bold"),
  title: ({ data }) => (data.list ? "Edit List" : "New List"),
});

function TileMark({ icon }: { icon: string }): JSX.Element {
  return (
    <span
      className={cn(
        "center relative z-10 size-control-md shrink-0 bg-fill text-ink-body group-hover:bg-fill-hover group-hover:text-ink",
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

function Option({
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
  return (
    <label
      onClick={(event) => {
        if ((event.target as Element).closest('[role="switch"]') || disabled)
          return;
        event.preventDefault();
        onChange(!checked);
      }}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col gap-3 rounded-card p-3 select-none",
        checked
          ? "bg-chosen ring-1 ring-chosen-edge ring-inset hover:bg-chosen-hover hover:ring-chosen-edge-hover"
          : `${WELL} ${WELL_HOVER}`,
      )}
    >
      <span className="flex items-center justify-between">
        <span
          className={cn(
            "center size-control-md rounded-full",
            checked
              ? "bg-chosen-hover text-chosen-ink"
              : "bg-fill text-ink-body",
          )}
        >
          <Icon className="ui-glyph center" icon={icon} size={18} />
        </span>
        <Switch
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </span>
      <span className="flex min-w-0 flex-col px-0.5">
        <span className={SURFACE_TITLE}>{label}</span>
        <span className="type-meta text-ink-muted">{description}</span>
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
        className="center relative z-10 shrink-0 text-ink-muted group-hover:translate-x-0.5 group-hover:text-ink-body"
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
  useSurfacePreload(listOrderSurface);
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
      const result = await saveListAction(list?.id ?? null, draft);
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
            <SurfacePart
              className={cn(SURFACE_PANEL, "flex flex-col")}
              name="item"
            >
              <Input
                aria-label="List name"
                appearance="bare"
                className="h-13 bg-transparent px-4 type-title font-semibold text-ink placeholder:font-medium placeholder:text-ink-faint"
                disabled={disabled}
                maxLength={LIST_TITLE_MAX}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="List name"
                value={draft.title}
                {...resetHighlight}
              />
              <span aria-hidden="true" className="mx-4 h-px bg-rule" />
              <Textarea
                aria-label="Description"
                appearance="bare"
                className="w-full resize-none bg-transparent px-4 py-3 type-body leading-6 text-ink-body placeholder:text-ink-muted"
                disabled={disabled}
                maxHeight={180}
                maxLength={LIST_DESCRIPTION_MAX}
                minHeight={84}
                onChange={(event) =>
                  updateDraft({ description: event.target.value })
                }
                placeholder="What is this list about? (optional)"
                value={draft.description}
                {...resetHighlight}
              />
            </SurfacePart>
            <div className="grid grid-cols-2 gap-2.5">
              <SurfacePart name="item">
                <Option
                  checked={draft.isRanked}
                  description="Numbered, in your order"
                  disabled={disabled}
                  icon="solar:ranking-bold"
                  label="Ranked"
                  onChange={(isRanked) => updateDraft({ isRanked })}
                />
              </SurfacePart>
              <SurfacePart name="item">
                <Option
                  checked={draft.isPrivate}
                  description="Only you can see it"
                  disabled={disabled}
                  icon="solar:lock-keyhole-bold"
                  label="Private"
                  onChange={(isPrivate) => updateDraft({ isPrivate })}
                />
              </SurfacePart>
            </div>
            {canOrder ? (
              <SurfacePart name="item">
                <FilmOrderLink
                  disabled={disabled}
                  onOpen={() =>
                    void (
                      openSurface &&
                      listOrderSurface.open(openSurface, {
                        data: {
                          listId: list.id,
                          title: list.title,
                        },
                      })
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
