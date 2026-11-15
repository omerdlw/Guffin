"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/design/components/icon";
import {
  takeOverDockCommands,
  useDockCommandOwner,
  useDockCommands,
} from "@/design/dock-commands";
import { setThemeChoice, type ThemeChoice, useThemeChoice } from "./store";

// The dock's theme command. Pressing it turns the whole command row into the
// theme picker: System keeps the theme button's place on the right, Light and
// Dark come in to its left. Picking one (or Escape, or a press anywhere else)
// gives the row back to the page's commands.

const THEME_ACTION_KEY = "theme.open";

const THEME_ACTION_ORDER = -30;

const OWNER = "theme";

const THEME_CHOICE_COPY: Record<ThemeChoice, { icon: string; title: string }> =
  {
    system: { icon: "solar:monitor-bold", title: "System" },
    light: { icon: "solar:sun-2-bold", title: "Light" },
    dark: { icon: "solar:moon-bold", title: "Dark" },
  };

// Left to right in the row (the dock sorts commands by descending order).
const PICKER: readonly ThemeChoice[] = ["light", "dark", "system"];

const CHOICE_ATTR = "data-theme-choice";

function ChoiceIcon({
  choice,
  chosen,
}: {
  choice: ThemeChoice;
  chosen: boolean;
}) {
  const { icon } = THEME_CHOICE_COPY[choice];
  return (
    <span
      {...{ [CHOICE_ATTR]: choice }}
      className={
        chosen
          ? "center absolute inset-0 rounded-full bg-grade/15 text-ink"
          : "center absolute inset-0 rounded-full"
      }
    >
      <Icon icon={icon} size={16} />
    </span>
  );
}

export function ThemeDockCommand() {
  const choice = useThemeChoice();
  const picking = useDockCommandOwner() === OWNER;
  const pathname = usePathname();

  const close = useCallback(() => takeOverDockCommands(null), []);
  const open = useCallback(() => takeOverDockCommands(OWNER), []);

  // A new page brings its own commands back.
  useEffect(() => close, [close, pathname]);

  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button")?.querySelector(`[${CHOICE_ATTR}]`)
      ) {
        return;
      }
      close();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [close, picking]);

  const actions = useMemo(() => {
    if (!picking) {
      return [
        {
          icon: THEME_CHOICE_COPY[choice].icon,
          key: THEME_ACTION_KEY,
          onClick: open,
          order: THEME_ACTION_ORDER,
          tooltip: "Theme",
        },
      ];
    }
    return PICKER.map((option, index) => ({
      icon: <ChoiceIcon choice={option} chosen={option === choice} />,
      // System takes over the theme button's slot, so it stays in place.
      key: option === "system" ? THEME_ACTION_KEY : `theme.${option}`,
      onClick: () => {
        setThemeChoice(option);
        close();
      },
      order: THEME_ACTION_ORDER + PICKER.length - 1 - index,
      tooltip: THEME_CHOICE_COPY[option].title,
    }));
  }, [choice, close, open, picking]);

  useDockCommands(actions, OWNER);
  return null;
}
