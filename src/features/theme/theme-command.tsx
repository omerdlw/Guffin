"use client";

import {
  type CSSProperties,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDockContextActions } from "@omerdlw/base-framework/dock";
import {
  Button,
  SlidingPill,
  useSlidingPill,
} from "@omerdlw/base-framework/ui";
import { createPortal } from "react-dom";
import { Icon } from "@/design/components/icon";
import { SHELL } from "@/design/foundations/layers";
import { Z_INDEX } from "@/design/foundations/z-index";
import { cn } from "@/design/ui";
import {
  setThemeChoice,
  THEME_CHOICES,
  type ThemeChoice,
  useThemeChoice,
} from "./store";

const THEME_ACTION_KEY = "theme.open";

const THEME_ACTION_ORDER = -30;

const THEME_CHOICE_COPY: Record<ThemeChoice, { icon: string; title: string }> =
  {
    system: { icon: "solar:monitor-bold", title: "System" },
    light: { icon: "solar:sun-2-bold", title: "Light" },
    dark: { icon: "solar:moon-bold", title: "Dark" },
  };

const GAP = 12;
const EDGE = 12;

type Anchor = { bottom: number; right: number };

const BUTTON = 'button[aria-label="Theme"]';

function placeOf(target: Element): Anchor {
  const box = target.getBoundingClientRect();
  return {
    bottom: Math.round(window.innerHeight - box.top + GAP),
    right: Math.max(EDGE, Math.round(window.innerWidth - box.right)),
  };
}

function useFollow(target: Element | null): Anchor | null {
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!target) {
      setAnchor(null);
      return;
    }
    let node: Element = target;
    let frame = 0;
    const tick = () => {
      if (!node.isConnected) {
        const next = [...document.querySelectorAll(BUTTON)].find(
          (el) => el.getBoundingClientRect().width > 0,
        );
        if (next) node = next;
      }
      const next = placeOf(node);
      setAnchor((now) =>
        now && now.bottom === next.bottom && now.right === next.right
          ? now
          : next,
      );
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return anchor;
}

function Segments({
  onClose,
  place,
}: {
  onClose: () => void;
  place: CSSProperties | undefined;
}) {
  const current = useThemeChoice();
  const { box, ref } = useSlidingPill<HTMLDivElement>(
    "[data-pill-target]",
    current,
  );

  return (
    <div
      aria-label="Theme"
      className={cn(
        "absolute flex items-stretch gap-0.5 rounded-full p-1",
        SHELL,
      )}
      ref={ref}
      role="menu"
      style={place}
    >
      {box ? (
        <SlidingPill box={box} className="inset-y-1 rounded-full bg-grade/15" />
      ) : null}
      {THEME_CHOICES.map((choice) => {
        const chosen = choice === current;
        const { icon, title } = THEME_CHOICE_COPY[choice];
        return (
          <Button
            aria-checked={chosen}
            aria-label={title}
            className={cn(chosen && "text-ink")}
            icon
            intent="ghost"
            shape="pill"
            size="chrome"
            data-pill-target={chosen ? "" : undefined}
            key={choice}
            onClick={() => {
              setThemeChoice(choice);
              onClose();
            }}
            role="menuitemradio"
            title={title}
          >
            <Icon icon={icon} size={18} />
          </Button>
        );
      })}
    </div>
  );
}

function ThemePopover({
  onClose,
  target,
}: {
  onClose: () => void;
  target: Element | null;
}) {
  const anchor = useFollow(target);

  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [target, onClose]);

  if (typeof document === "undefined") return null;

  const place: CSSProperties | undefined = anchor
    ? { bottom: anchor.bottom, right: anchor.right }
    : undefined;

  return createPortal(
    <>
      {target && anchor ? (
        <div
          className="fixed inset-0"
          key="theme-layer"
          style={{ zIndex: Z_INDEX.CONTEXT_MENU }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            onPointerDown={onClose}
          />
          <Segments onClose={onClose} place={place} />
        </div>
      ) : null}
    </>,
    document.body,
  );
}

export function ThemeDockCommand() {
  const choice = useThemeChoice();
  const [target, setTarget] = useState<Element | null>(null);
  const close = useCallback(() => setTarget(null), []);

  const open = useCallback((event?: SyntheticEvent) => {
    const target = event?.currentTarget;
    if (!(target instanceof Element)) return;
    setTarget((current) => (current ? null : target));
  }, []);

  const actions = useMemo(
    () => [
      {
        icon: THEME_CHOICE_COPY[choice].icon,
        key: THEME_ACTION_KEY,
        onClick: open,
        order: THEME_ACTION_ORDER,
        tooltip: "Theme",
      },
    ],
    [choice, open],
  );

  useDockContextActions(actions);
  return <ThemePopover onClose={close} target={target} />;
}
