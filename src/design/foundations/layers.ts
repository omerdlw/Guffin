import { variants } from "./variants";

/**
 * Layers: the glass every piece of chrome is cut from (the dock, modals, the
 * context menu, toasts, tooltips) and what dims the page behind them.
 */
export const layerVariants = variants("", {
  variants: {
    kind: {
      /** chrome that holds controls: the dock card, menus, modals */
      shell: "bg-glass ring-1 ring-edge-hover ring-inset backdrop-saturate-150",
      /** a floating pill: dock controls, breadcrumbs, toasts */
      float:
        "bg-glass ring-1 ring-edge-hover ring-inset backdrop-saturate-150",
      /** a tooltip */
      tip: "bg-glass text-ink-lead ring-1 ring-edge ring-inset backdrop-saturate-150",
      /** a veil laid over a picture, behind a layer */
      veil: "bg-veil",
      /** a layer left under the top one */
      dim: "bg-dim",
    },
  },
});

export const SHELL = layerVariants({ kind: "shell" });
export const FLOAT = layerVariants({ kind: "float" });
export const TIP = layerVariants({ kind: "tip" });
export const BACKDROP = layerVariants({ kind: "veil" });
export const DIM = layerVariants({ kind: "dim" });
/** Glass without blur or saturation, for a layer that sets its own. */
export const GLASS = "bg-glass ring-1 ring-inset ring-edge-hover";
