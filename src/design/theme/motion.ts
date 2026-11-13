import { defineMotion } from "@omerdlw/base-framework/utils";

// Modules (dock, modal, toast, context menu) are still until their own
// choreography is written: every module transition is instant.
export const INSTANT = { type: "tween", duration: 0 } as const;

export const moduleMotion = defineMotion({
  reducedMotion: "always",
  still: INSTANT,
});
