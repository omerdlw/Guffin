const RHYTHM_GAP = "gap-8 sm:gap-10 lg:gap-12";
const RHYTHM_GAP_Y = "gap-y-8 sm:gap-y-10 lg:gap-y-12";
const STACK_CLASS = `flex w-full flex-col ${RHYTHM_GAP}`;

export const PAGE_CLASS = "min-h-screen pb-[calc(var(--dock-h,6rem)+2rem)]";
export const CONTAINER_CLASS =
  "relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 [overflow-anchor:none] sm:px-6 lg:px-8";

export const OVERLAP = "-mt-32 sm:-mt-48 lg:-mt-64 xl:-mt-72";

const overlapClass = (hasBackdrop: boolean) =>
  hasBackdrop ? OVERLAP : "pt-6 sm:pt-8 lg:pt-10";

export const COLUMNS_CLASS = `grid w-full grid-cols-1 items-start gap-x-8 ${RHYTHM_GAP_Y} lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] xl:grid-cols-[24rem_minmax(0,1fr)]`;

export const bodyClass = (hasBackdrop: boolean) =>
  `relative ${COLUMNS_CLASS} ${overlapClass(hasBackdrop)}`;

export const pageBodyClass = (hasBackdrop: boolean) =>
  `relative flex w-full flex-col ${RHYTHM_GAP} ${overlapClass(hasBackdrop)}`;

export const HEADER_CLASS =
  "relative flex w-full min-w-0 flex-col lg:col-start-2 lg:row-start-1";
export const ASIDE_CLASS =
  "w-full shrink-0 self-start lg:col-start-1 lg:row-span-2 lg:row-start-1";
export const MAIN_COLUMN_CLASS = `${STACK_CLASS} min-w-0 lg:col-start-2 lg:row-start-2`;
export const VIEW_CLASS = STACK_CLASS;

const HEADLINE_SIZES = [
  "type-display-lg sm:type-display-xl lg:type-display-2xl",
  "type-display-md sm:type-display-lg lg:type-display-xl",
  "type-display-sm sm:type-display-md lg:type-display-lg",
  "type-display-xs sm:type-display-sm lg:type-display-md",
] as const;
const HEADLINE_FACE = "font-zuume leading-none font-bold uppercase";

export const HEADLINE_BOX =
  "relative top-[calc(-0.14em-round(-0.14em,1px))] mt-[round(-0.14em,1px)] mb-[round(-0.16em,1px)] max-w-full";
export const HEADLINE_TYPE = `${HEADLINE_FACE} ${HEADLINE_SIZES[0]}`;

export function headlineClass(
  text: string,
  limits: readonly [number, number, number],
): string {
  const length = text.trim().length;
  const step = limits.findIndex((limit) => length <= limit);
  const size = HEADLINE_SIZES[step === -1 ? HEADLINE_SIZES.length - 1 : step];
  return `${HEADLINE_BOX} ${HEADLINE_FACE} ${size} text-balance [overflow-wrap:anywhere]`;
}

export const RULE_GAP = "mt-10 mb-6";
export const PROSE_BOX = "max-w-[62ch]";
export const PROSE_TYPE = "text-left type-prose";
export const PROSE_CLASS = `${PROSE_BOX} ${PROSE_TYPE} text-pretty`;

export const SIDEBAR_CLASS =
  "grid grid-cols-1 items-start gap-x-8 gap-y-6 sm:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-1";
export const FACT_ROW_TYPE = "type-body";

export const CAROUSEL_ITEM =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)]";
export const CAROUSEL_WIDE_ITEM = "w-full sm:w-[calc((100%-0.75rem)/2)]";

export const RADIUS = {
  thumb: 8,
  tile: 12,
  card: 16,
  panel: 20,
  sheet: 24,
  inset: 10,
  shell: 26,
} as const;

export const nested = (outer: number, padding: number) =>
  Math.max(0, outer - padding);

const PAGE_GLASS =
  "rounded-full bg-black/60 text-ink ring-1 ring-edge-hover ring-inset backdrop-blur-md backdrop-saturate-150";

const SURFACE =
  "bg-fill ring-1 ring-edge ring-inset hover:bg-fill-hover focus-visible:bg-fill-hover hover:ring-edge-hover focus-visible:ring-edge-focus";

export const TONE = {
  arrows: `${PAGE_GLASS} hover:bg-black/70 focus-visible:bg-black/70`,
  chosen:
    "bg-grade/15 text-grade ring-1 ring-grade/25 ring-inset hover:bg-grade/20 focus-visible:bg-grade/20 hover:ring-grade/30 focus-visible:ring-grade/30",
  glass: PAGE_GLASS,
  label: "type-label font-semibold tracking-label uppercase",
  link: "cine-fade type-label font-semibold tracking-label uppercase text-ink-muted hover:text-ink focus-visible:text-ink",
  more: `cine-press center h-10 w-full cursor-pointer gap-2 rounded-full type-control font-medium text-ink-body hover:text-ink focus-visible:text-ink ${SURFACE}`,
  rule: "bg-rule",
  rules: "divide-rule",
  select: {
    content: "rounded-panel",
    option: "rounded-card",
    trigger: `rounded-full ${SURFACE}`,
  },
  surface: `text-ink-body hover:text-ink focus-visible:text-ink ${SURFACE}`,
  tabs: "rounded-full [&_[data-pill]]:rounded-full [&_[role=tab]]:rounded-full",
} as const;

export const GLASS = "bg-black/70 ring-1 ring-inset ring-edge-hover";

export const SHELL = `${GLASS} backdrop-saturate-150`;

export const FLOAT = `${GLASS} backdrop-blur-lg backdrop-saturate-150`;

export const TIP =
  "bg-black/70 text-ink-lead ring-1 ring-inset ring-edge backdrop-blur-xl backdrop-saturate-150";

export const BACKDROP = "bg-black/60 backdrop-blur-md";

export const DIM = "bg-black/30 backdrop-blur-xs";

export const FILL =
  "bg-fill ring-1 ring-inset ring-edge hover:bg-fill-hover focus-visible:bg-fill-hover hover:ring-edge-hover focus-visible:ring-edge-focus";

export const PRIMARY =
  "ui-sheen bg-white text-black ring-1 ring-inset ring-white hover:bg-white/90 focus-visible:bg-white/90 [--sheen-ink:0_0_0] [--sheen:0.1]";

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
