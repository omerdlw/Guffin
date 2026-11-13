"use client";

import { type JSX, type KeyboardEvent, memo, useEffect, useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  Button,
  HighlightGroup,
  Image,
  Loader,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { SurfacePart, SurfaceStage } from "@/design/components/surface";
import {
  SURFACE_META,
  SURFACE_PANEL,
  SURFACE_POSTER,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface-classes";
import { defineSurface } from "@/design/surface-definition";
import { cn } from "@/design/ui";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Reorder, useDragControls } from "@/motion/lib";
import { getListOrderAction, reorderListAction } from "./actions";
import type { ListOrderItem } from "./list";

interface ListOrderState {
  order: ListOrderItem[];
  saved: ListOrderItem[] | null;
  status: "failed" | "loading" | "ready";
}

interface ListOrderData {
  listId: string;
  title: string;
}

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function orderKeyTarget(
  key: string,
  index: number,
  total: number,
): number | null {
  switch (key) {
    case "ArrowUp":
      return index - 1;
    case "ArrowDown":
      return index + 1;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}

export const listOrderSurface = defineSurface<{ data: ListOrderData }>({
  component: ListOrderSurface,
  description: ({ data }) => data.title,
  icon: "solar:sort-vertical-bold",
  title: "Film Order",
});

const OrderRow = memo(function OrderRow({
  index,
  item,
  onMove,
  total,
}: {
  index: number;
  item: ListOrderItem;
  onMove: (from: number, to: number) => void;
  total: number;
}): JSX.Element {
  const controls = useDragControls();
  const highlight = useHighlight(String(item.tmdbId));
  const [dragging, setDragging] = useState(false);
  const poster = item.posterPath
    ? tmdbImageUrl("poster", item.posterPath, "w92")
    : null;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const to = orderKeyTarget(event.key, index, total);
    if (to === null) return;
    event.preventDefault();
    if (to >= 0 && to < total && to !== index) onMove(index, to);
  }

  return (
    <Reorder.Item
      as="li"
      className={cn(
        tileVariants(),
        "relative isolate pr-1.5",
        dragging && "z-10 bg-fill-active",
      )}
      dragControls={controls}
      dragListener={false}
      onDragEnd={() => setDragging(false)}
      onDragStart={() => setDragging(true)}
      value={item}
      {...highlight.props}
    >
      {dragging ? null : highlight.node}
      <span className="w-7 shrink-0 text-center type-meta font-medium text-ink-muted tabular-nums">
        {index + 1}
      </span>
      <div
        className={cn(
          SURFACE_POSTER,
          "bg-fill ring-1 ring-edge ring-inset",
          SURFACE_TILE_INNER,
        )}
      >
        {poster ? (
          <Image
            alt=""
            className="pointer-events-none size-full object-cover select-none"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={poster}
            wrapperClassName="size-full"
          />
        ) : (
          <div className="center size-full text-ink-muted">
            <Icon icon="solar:filmstrip-bold" size={14} />
          </div>
        )}
      </div>
      <div className={cn(SURFACE_TEXT, "select-none")}>
        <span className={SURFACE_TITLE}>{item.title}</span>
        {item.year ? (
          <span className={cn(SURFACE_META, "tabular-nums")}>{item.year}</span>
        ) : null}
      </div>
      <Button
        aria-label={`Move ${item.title}, place ${index + 1} of ${total}`}
        className={cn(
          "center size-10 shrink-0 cursor-grab touch-none text-ink-body outline-none hover:bg-fill-hover hover:text-ink focus-visible:bg-fill-hover focus-visible:text-ink active:cursor-grabbing",
          SURFACE_TILE_INNER,
        )}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          event.preventDefault();
          controls.start(event);
        }}
        type="button"
      >
        <Icon icon="solar:hamburger-menu-linear" size={18} />
      </Button>
    </Reorder.Item>
  );
});

function ListOrderSurface({ data }: { data: ListOrderData }): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { closeAllSurfaces } = useDockActions();
  const [arrangement, setArrangement] = useState<ListOrderState>({
    order: [],
    saved: null,
    status: "loading",
  });
  const [saving, setSaving] = useState(false);
  const { order, saved, status } = arrangement;

  const setOrder = (next: ListOrderItem[]) =>
    setArrangement((current) => ({ ...current, order: next }));

  useEffect(() => {
    let live = true;
    const fail = () =>
      setArrangement((current) => ({ ...current, status: "failed" }));
    getListOrderAction(data.listId)
      .then((result) => {
        if (!live) return;
        if (!result.success) {
          fail();
          toast(result.error);
          return;
        }
        setArrangement({
          order: result.items,
          saved: result.items,
          status: "ready",
        });
      })
      .catch((error) => {
        report("ListOrderSurface read", error);
        if (live) fail();
      });
    return () => {
      live = false;
    };
  }, [data.listId, toast]);

  const changed =
    saved !== null &&
    order.some((item, index) => item.tmdbId !== saved[index]?.tmdbId);

  async function save() {
    if (!changed || saving) return;
    setSaving(true);
    try {
      const result = await reorderListAction(
        data.listId,
        order.map((item) => item.tmdbId),
      );
      if (!result.success) {
        toast(result.error);
        return;
      }
      closeAllSurfaces?.();
      router.refresh();
    } catch (error) {
      report("ListOrderSurface save", error);
      toast(toUserMessage(error, { fallback: "Could not save the new order" }));
    } finally {
      setSaving(false);
    }
  }

  if (status !== "ready" || saved === null) {
    return (
      <div className={cn(SURFACE_PANEL, "center min-h-40 flex-col gap-2 p-4")}>
        {status === "failed" ? (
          <p className="type-body text-ink-body">
            This list could not be loaded
          </p>
        ) : (
          <Loader />
        )}
      </div>
    );
  }

  return (
    <SurfaceStage>
      <div className={SURFACE_STACK}>
        <SurfacePart name="item">
          <HighlightGroup>
            <Reorder.Group
              axis="y"
              className={cn(
                SURFACE_SCROLL,
                "flex max-h-[min(56dvh,28rem)] flex-col gap-2.5",
              )}
              data-scroll-native
              layoutScroll
              onReorder={setOrder}
              values={order}
            >
              {order.map((item, index) => (
                <OrderRow
                  index={index}
                  item={item}
                  key={item.tmdbId}
                  onMove={(from, to) => setOrder(moveItem(order, from, to))}
                  total={order.length}
                />
              ))}
            </Reorder.Group>
          </HighlightGroup>
        </SurfacePart>
        <SurfacePart className="flex items-center gap-2.5" name="item">
          <Button
            intent="neutral"
            width="fill"
            disabled={!changed || saving}
            onClick={() => setOrder(saved)}
          >
            <Icon icon="solar:restart-linear" size={15} />
            Undo changes
          </Button>
          <Button
            intent="primary"
            width="fill"
            disabled={!changed || saving}
            loading={saving}
            onClick={() => void save()}
          >
            Save order
          </Button>
        </SurfacePart>
      </div>
    </SurfaceStage>
  );
}
