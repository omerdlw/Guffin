"use client";

import type { WheelEvent } from "react";
import { FILL, PRIMARY } from "@/config/theme/chrome";

const BUTTON =
  "center relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-card type-control font-medium ring-1 ring-inset select-none outline-none focus-visible:ring-edge-focus disabled:pointer-events-none disabled:opacity-50";
const IDLE = `text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`;
const LIT =
  "bg-grade/15 text-grade ring-grade/25 hover:bg-grade/20 focus-visible:bg-grade/20 hover:ring-grade/30 focus-visible:ring-grade/30";
const ROW_IDLE = "bg-fill text-ink-body hover:text-ink focus-visible:text-ink";
const ROW_LIT =
  "bg-grade/15 text-grade ring-1 ring-inset ring-grade/25 hover:ring-grade/30 focus-visible:ring-grade/30";

export const surfaceButton = (lit: boolean) =>
  `${BUTTON} h-10 ${lit ? LIT : IDLE}`;

export const SURFACE_PRIMARY = `${BUTTON} h-10 px-4 ${PRIMARY}`;

export const SURFACE_DANGER = `${BUTTON} h-10 px-4 bg-danger/15 text-danger ring-danger/25 hover:bg-danger/20 focus-visible:bg-danger/20 hover:ring-danger/30 focus-visible:ring-danger/30`;

export const surfaceIconButton = (lit: boolean) =>
  `${BUTTON} size-10 shrink-0 p-0 ${lit ? LIT : IDLE}`;

export const SURFACE_STACK = "flex w-full flex-col gap-2.5";

const TILE_SHAPE = "flex min-w-0 items-center gap-3 rounded-card p-1.5";
export const SURFACE_TILE = `${TILE_SHAPE} bg-fill`;
export const SURFACE_TILE_LIT = "bg-grade/15 ring-1 ring-inset ring-grade/25";
export const SURFACE_TILE_HOVER =
  "hover:bg-fill-hover focus-visible:bg-fill-hover";
export const SURFACE_TILE_INNER = "rounded-inset";
export const SURFACE_TILE_END = "pr-3.5";

export const SURFACE_POSTER = "h-[60px] w-10 shrink-0 overflow-hidden";

export const SURFACE_TEXT =
  "flex min-w-0 flex-1 flex-col justify-center text-left";
export const SURFACE_TITLE = "truncate type-body font-semibold text-ink";
export const SURFACE_META = "truncate type-meta text-ink-muted";

export const surfaceRow = (lit: boolean) =>
  `group relative isolate w-full cursor-pointer ${TILE_SHAPE} ${SURFACE_TILE_END} select-none outline-none disabled:cursor-wait ${lit ? ROW_LIT : ROW_IDLE}`;

export const SURFACE_PANEL = "rounded-card bg-fill";

export const SURFACE_CHECK_ON = "bg-grade text-black ring-grade";

export const SURFACE_FIELD =
  "rounded-card bg-fill text-ink ring-1 ring-edge ring-inset outline-none placeholder:text-ink-muted hover:bg-fill-hover focus:bg-fill-hover focus:ring-edge-focus";

export const SURFACE_SCROLL =
  "overflow-y-auto overscroll-contain rounded-card [clip-path:inset(0_round_var(--radius-card))] scrollbar-none";

export function scrollWithin(event: WheelEvent<HTMLElement>) {
  const box = event.currentTarget;
  if (box.scrollHeight <= box.clientHeight) return;
  event.preventDefault();
  event.stopPropagation();
  const max = box.scrollHeight - box.clientHeight;
  box.scrollTop = Math.min(max, Math.max(0, box.scrollTop + event.deltaY));
}

export function SurfaceProse({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <div
      className={`${SURFACE_PANEL} ${SURFACE_SCROLL} max-h-[min(52dvh,24rem)] p-4`}
      data-lenis-prevent
      data-lenis-prevent-wheel
      onWheel={scrollWithin}
    >
      <div className="flex flex-col gap-3 type-body leading-6 text-pretty [overflow-wrap:anywhere] text-ink-body select-text">
        {paragraphs.map((paragraph, index) => (
          <p className="whitespace-pre-line" key={index}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
