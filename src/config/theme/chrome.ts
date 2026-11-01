// The chrome every floating layer is cut from, shared by the dock, modal,
// context menu, toasts and the surfaces inside them. DESIGN.md has the rules.

// Dark glass: 70% black, an edge ring and a 1px top light.
export const GLASS =
  "bg-black/70 ring-1 ring-inset ring-edge-hover inset-shadow-[0_1px_0_var(--color-edge)]";

// A layer that holds content: the dock card, a modal, a menu.
export const SHELL = `${GLASS} shadow-lift backdrop-saturate-150`;

// One control or note floating over the page: dock buttons, toasts.
export const FLOAT = `${GLASS} shadow-float backdrop-blur-lg backdrop-saturate-150`;

// A label that points at something: tooltips. Lighter edge, lead ink.
export const TIP =
  "bg-black/70 text-ink-lead ring-1 ring-inset ring-edge inset-shadow-[0_1px_0_var(--color-edge)] shadow-float backdrop-blur-xl backdrop-saturate-150";

// What dims the page behind a layer.
export const BACKDROP = "bg-black/60 backdrop-blur-md";

// A control inside a layer, at rest and hovered.
export const FILL =
  "bg-fill ring-1 ring-inset ring-edge hover:bg-fill-hover hover:ring-edge-hover";

// The one action a layer exists for.
export const PRIMARY =
  "ui-sheen bg-white text-black ring-1 ring-inset ring-white hover:bg-white/90 [--sheen-ink:0_0_0] [--sheen:0.1]";
