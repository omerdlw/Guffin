// Plain helpers (no "use client"): server components mark triggers with them.

export type TipSide = "top" | "right" | "bottom" | "left";

/**
 * Marks an element as having a tooltip. The tip itself is drawn by one
 * shared element (`TipHost`) that opens after a pause and then glides from
 * trigger to trigger, so nothing here renders a tooltip.
 */
export function tipProps(
  text: string | undefined,
  options: {
    image?: string | null;
    kind?: "dock";
    owned?: boolean;
    side?: TipSide;
    sub?: string | null;
  } = {},
): Record<string, string | undefined> {
  if (!text) return {};
  return {
    "data-cursor-owned": options.owned ? "" : undefined,
    "data-tip": text,
    "data-tip-image": options.image ?? undefined,
    "data-tip-sub": options.sub ?? undefined,
    "data-tip-kind": options.kind,
    "data-tip-side": options.side,
  };
}

/** Marks a link to an account: hovering it opens that account's card. */
export function accountTip(
  username: string | null | undefined,
  side: TipSide = "top",
): Record<string, string | undefined> {
  return username
    ? { "data-tip-account": username, "data-tip-side": side }
    : {};
}

