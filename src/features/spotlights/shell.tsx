"use client";

import {
  type JSX,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/dock";
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockAction } from "@/design/components/surface";
import { Room } from "@/motion/kit";
import { MotionConfig } from "@/motion/lib";
import { bindScore } from "@/motion/react";
import { mountScene } from "@/motion/render";
import { defineScore } from "@/motion/score";
import type { Stage } from "@/motion/stage";
import { type LoopFactory, typing } from "./spotlights";

interface SpotlightDockAction {
  icon: string;
  label: string;
  onClick?: () => void;
}

const DIRECTORS_DOCK_SETTLE_MS = 400;

const GESTURE_THRESHOLD = 28;

const GESTURE_END_MS = 220;

const URL_SYNC_DELAY_MS = 500;

const SALON = defineScore({
  cast: {
    scene: { matter: "plate", enter: "still", leave: "fade" },
    chrome: { matter: "glass", enter: "still", leave: "fade" },
  },
  opening: [["scene", "chrome"]],
});

const bound = bindScore(SALON);

const SalonStageRoot = bound.StageRoot;
export const SalonPart = bound.Part;

export function SalonStage({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <SalonStageRoot grade={null}>
      <Room black />
      <MotionConfig reducedMotion="user">
        <main
          id="main"
          className={`${className} ui-scene overflow-x-clip`}
          data-cinematic=""
        >
          {children}
        </main>
      </MotionConfig>
    </SalonStageRoot>
  );
}

export function mountSpotlight<R extends { dispose(): void }>(
  stage: Stage<string, string>,
  canvas: HTMLCanvasElement,
  build: (canvas: HTMLCanvasElement, loop: LoopFactory) => R | null,
  pixelRatio: number,
): { renderer: R | null; dispose: () => void } {
  const built: { renderer: R | null } = { renderer: null };
  const dispose = mountScene(
    stage,
    "scene",
    canvas,
    (element, wake) => {
      let step: ((now: number, dt: number) => boolean) | null = null;
      const renderer = build(element, (next) => {
        step = next;
        return {
          dispose: () => {
            step = null;
          },
          wake,
        };
      });
      built.renderer = renderer;
      if (!renderer) return null;
      return {
        draw: ({ delta }) => step?.(performance.now() / 1000, delta) ?? false,
        dispose: () => renderer.dispose(),
      };
    },
    { css: true, pixelRatio },
  );
  return { renderer: built.renderer, dispose };
}

export function useGestureStep(
  step: (direction: -1 | 1) => void,
  { enabled = true, keys = true }: { enabled?: boolean; keys?: boolean } = {},
): void {
  const onStep = useEffectEvent(step);

  useEffect(() => {
    if (!enabled) return;
    let total = 0;
    let locked = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        total = 0;
        locked = false;
      }, GESTURE_END_MS);
      if (locked) return;
      total += delta * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(total) < GESTURE_THRESHOLD) return;
      locked = true;
      onStep(total > 0 ? 1 : -1);
    };

    const onKey = (event: KeyboardEvent) => {
      if (!keys || event.defaultPrevented || typing(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onStep(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onStep(-1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, keys]);
}

export function useSyncedSearchParam(key: string, value: string): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState(window.history.state, "", url);
    }, URL_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, value]);
}

export function useDockWidth(fallback: number): number {
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let observer: ResizeObserver | null = null;
    let tries = 0;

    const attach = () => {
      const dock = document.querySelector<HTMLElement>(".dock-root");
      if (!dock) {
        if (tries++ < 240) frame = requestAnimationFrame(attach);
        return;
      }
      const read = () => {
        const next = Math.round(dock.getBoundingClientRect().width);
        if (next > 0) setWidth(next);
      };
      read();
      observer = new ResizeObserver(() => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(read, DIRECTORS_DOCK_SETTLE_MS);
      });
      observer.observe(dock);
    };

    attach();
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  return width;
}

export function SpotlightLoading(): JSX.Element {
  return (
    <main
      id="main"
      aria-hidden="true"
      className="ui-scene relative h-dvh overflow-hidden"
      data-cinematic
    >
      <div className="fixed inset-0 z-20 bg-page" />
    </main>
  );
}

export function SpotlightDock({
  action,
  control,
  description,
  href,
  icon,
  path,
  title,
}: {
  action?: SpotlightDockAction;
  control?: JSX.Element;
  description: string;
  href?: string;
  icon: string;
  path: string;
  title: string;
}): null {
  const button = useMemo(
    () =>
      control ??
      (action ? (
        <Open
          href={href}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          title={title}
        />
      ) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the action's fields, not its identity
    [action?.icon, action?.label, action?.onClick, control, href, title],
  );
  const config = useMemo(
    () => ({ action: button, description, icon, path, title }),
    [button, description, icon, path, title],
  );
  useDockRegistration(config);
  return null;
}

function Open({
  href,
  icon,
  label,
  onClick,
  title,
}: SpotlightDockAction & { href?: string; title: string }): JSX.Element {
  const actionClass = useDockActionClass();
  const { navigate } = useDockActions();
  return (
    <DockAction>
      <Button
        aria-label={href ? `${label}: ${title}` : label}
        className={actionClass({ className: "w-full" })}
        onClick={() => {
          if (onClick) onClick();
          else if (href) void navigate(href);
        }}
        type="button"
      >
        <Icon icon={icon} size={16} />
        <span className="truncate">{label}</span>
      </Button>
    </DockAction>
  );
}
