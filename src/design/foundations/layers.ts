import { variants } from "./variants";

const layerVariants = variants("", {
  variants: {
    kind: {
      shell:
        "lit lift bg-glass ring-1 ring-edge-hover ring-inset backdrop-saturate-150",
      float:
        "lit bg-glass ring-1 ring-edge-hover ring-inset backdrop-saturate-150",
      tip: "lit lift bg-glass text-ink-lead ring-1 ring-edge ring-inset backdrop-saturate-150",
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
export const GLASS = "lit bg-glass ring-1 ring-inset ring-edge-hover";
