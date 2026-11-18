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
