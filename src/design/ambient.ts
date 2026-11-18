"use client";

import {
  type AmbientConfig,
  type AmbientPalette,
  useAmbientTheme,
} from "@omerdlw/base-framework/ambient";

declare module "@omerdlw/base-framework/navigation" {
  interface NavigationPayload {
    palette?: AmbientPalette | null;
  }
}

/**
 * Light for a stage, from the framework's ambient palette (made for a light
 * ground, see `lib/ambient.ts`):
 *
 * - a picture URL themes the page from that picture;
 * - `null` hands the page back neutral at once: it takes over from the page
 *   before (which would otherwise linger) and leaves every `--ambient-*`
 *   variable to its paper fallback;
 * - `undefined` leaves the light to whoever sets it (a page chrome).
 *
 * `linger: 0` drops the light as soon as the stage lets go of it, for a light
 * laid over a page's own (a gallery picture over the film's).
 */
export type StageLight = string | null | undefined;

const NEUTRAL: AmbientConfig = { colors: { "--ambient-presence": "0" } };

const NONE: AmbientConfig = {};

export function useStageLight(
  picture: StageLight,
  { linger }: { linger?: number } = {},
): void {
  useAmbientTheme(
    picture === undefined
      ? NONE
      : picture === null
        ? NEUTRAL
        : { image: picture, linger },
  );
}
