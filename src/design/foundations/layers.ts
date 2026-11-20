import { variants } from "./variants";

const layerVariants = variants("", {
  variants: {
    kind: {
      shell: "liquid liquid-lens",
      float: "liquid liquid-flat liquid-lens",
      tip: "liquid liquid-lens liquid-tip text-ink-lead",
      veil: "bg-veil",
      dim: "bg-dim",
    },
  },
});

export const SHELL = layerVariants({ kind: "shell" });
export const FLOAT = layerVariants({ kind: "float" });
export const TIP = layerVariants({ kind: "tip" });
export const BACKDROP = layerVariants({ kind: "veil" });
export const DIM = layerVariants({ kind: "dim" });
export const GLASS = "liquid liquid-flat liquid-lens";
export const CHOSEN =
  "[--liquid-tint:var(--liquid-tint-chosen)] [--rim-key:var(--rim-chosen-key)] [--rim-fill:var(--rim-chosen-fill)] [--rim-shade:var(--rim-chosen-shade)]";
