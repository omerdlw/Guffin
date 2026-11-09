import type { ThemeChoice } from "@/lib/theme";

export const THEME_ACTION_KEY = "theme.open";

/** The lowest order sits furthest right; search is at -20, so this is past it. */
export const THEME_ACTION_ORDER = -30;

export const THEME_CHOICE_COPY: Record<
  ThemeChoice,
  { icon: string; title: string }
> = {
  system: { icon: "solar:monitor-bold", title: "System" },
  light: { icon: "solar:sun-2-bold", title: "Light" },
  dark: { icon: "solar:moon-bold", title: "Dark" },
};
