const RHYTHM_GAP = "gap-8 sm:gap-10 lg:gap-12";
const RHYTHM_GAP_Y = "gap-y-8 sm:gap-y-10 lg:gap-y-12";
const STACK_CLASS = `flex w-full flex-col ${RHYTHM_GAP}`;

export const PAGE_CLASS = "min-h-screen pb-[calc(var(--dock-h,6rem)+2rem)]";
export const CONTAINER_CLASS =
  "relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 [overflow-anchor:none] sm:px-6 lg:px-8";

const overlapClass = (hasBackdrop: boolean) =>
  hasBackdrop
    ? "-mt-32 sm:-mt-48 lg:-mt-64 xl:-mt-72"
    : "pt-6 sm:pt-8 lg:pt-10";

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

const GLASS =
  "rounded-full bg-black/60 text-ink ring-1 ring-edge-hover ring-inset backdrop-blur-md backdrop-saturate-150";

const SURFACE =
  "bg-fill ring-1 ring-edge ring-inset hover:bg-fill-hover focus-visible:bg-fill-hover hover:ring-edge-hover focus-visible:ring-edge-focus";

export const TONE = {
  arrows: `${GLASS} hover:bg-black/70 focus-visible:bg-black/70`,
  chosen:
    "bg-grade/15 text-grade ring-1 ring-grade/25 ring-inset hover:bg-grade/20 focus-visible:bg-grade/20 hover:ring-grade/30 focus-visible:ring-grade/30",
  glass: GLASS,
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
