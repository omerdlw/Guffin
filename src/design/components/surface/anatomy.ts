/*
 * The anatomy of a surface tile or row: the named parts that sit inside one.
 * Compose them with `rowVariants` / `tileVariants`:
 *
 *   <div className={tileVariants()}>
 *     <span className={cn(SURFACE_POSTER, SURFACE_TILE_INNER)}>…</span>
 *     <span className={SURFACE_TEXT}>
 *       <span className={SURFACE_TITLE}>…</span>
 *       <span className={SURFACE_META}>…</span>
 *     </span>
 *   </div>
 */

/** Rows and tiles stacked in a surface. */
export const SURFACE_STACK = "flex w-full flex-col gap-2.5";
/** The radius of a frame inside a tile: a card less the tile's padding. */
export const SURFACE_TILE_INNER = "rounded-inset";
/** The room a row leaves after its text, for a trailing check or count. */
export const SURFACE_TILE_END = "pr-3.5";
export const SURFACE_POSTER = "h-[60px] w-10 shrink-0 overflow-hidden";
export const SURFACE_TEXT =
  "flex min-w-0 flex-1 flex-col justify-center text-left";
export const SURFACE_TITLE = "truncate type-body font-semibold text-ink";
export const SURFACE_META = "truncate type-meta text-ink-muted";
/** A plain panel for text inside a surface. */
export const SURFACE_PANEL = "rounded-card bg-fill";
/** A panel that scrolls on its own, clipped to its corners. */
export const SURFACE_SCROLL =
  "overflow-y-auto overscroll-contain rounded-card [clip-path:inset(0_round_var(--radius-card))] scrollbar-none";
