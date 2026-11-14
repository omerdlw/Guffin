import { defineMotion } from "@omerdlw/base-framework/utils";

// Modules move only where their theme says so. The dock has its own
// choreography (dock-motion.ts); modal, toast and context menu are still
// until theirs is written, so their transitions are instant. Motion follows
// the visitor's reduced-motion setting: reduced, every module transition
// becomes `still`.
export const INSTANT = { type: "tween", duration: 0 } as const;

export const moduleMotion = defineMotion({
  reducedMotion: "user",
  still: INSTANT,
});
