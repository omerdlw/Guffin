"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/design/components/logo";
import { cn } from "@/design/foundations/cn";
import { gradeOf, rgbOf } from "./color";
import {
  POINTS,
  SCREEN_BEAM,
  SCREEN_DIM,
  SCREEN_LINE,
  SCREEN_OFF,
  SCREEN_ON,
  SCREEN_UNTINTED,
  SCREEN_WAKE,
} from "./constants";
import { houseDown } from "./kit";
import { useEngine } from "./react";
import type { Tint } from "./types";
import { passThrough } from "./utils";

function afterglow(box: DOMRect) {
  const point = document.createElement("div");
  point.setAttribute("aria-hidden", "true");
  Object.assign(point.style, {
    background: SCREEN_BEAM,
    borderRadius: "9999px",
    height: "2px",
    left: `${box.left}px`,
    pointerEvents: "none",
    position: "fixed",
    top: `${box.top + box.height / 2 - 1}px`,
    width: `${box.width}px`,
    zIndex: String(Z_INDEX.MODAL + 1),
  });
  document.body.append(point);
  const animation = point.animate(
    [
      { offset: 0, opacity: 0, transform: "scaleX(1)" },
      { offset: 0.04, opacity: 1, transform: "scaleX(1)" },
      {
        easing: "cubic-bezier(0.06, 0.62, 0.2, 1)",
        offset: SCREEN_OFF.point / (SCREEN_OFF.point + SCREEN_OFF.glow),
        opacity: 1,
        transform: "scaleX(0.006)",
      },
      { opacity: 0, transform: "scaleX(0.004)" },
    ],
    {
      delay: SCREEN_OFF.collapse * 1000 * 0.8,
      duration: (SCREEN_OFF.point + SCREEN_OFF.glow) * 1000,
      easing: "cubic-bezier(0.5, 0, 0.9, 0.6)",
      fill: "both",
    },
  );
  const remove = () => point.remove();
  animation.onfinish = remove;
  animation.oncancel = remove;
}

export function Tube({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const present = useIsPresent();
  const set = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (present || reduced || !set.current) return;
    afterglow(set.current.getBoundingClientRect());
  }, [present, reduced]);

  const line = SCREEN_ON.line / SCREEN_ON.run;
  return (
    <motion.div
      animate={{
        scaleX: [0, 1, 1],
        scaleY: [SCREEN_LINE, SCREEN_LINE, 1],
        transition: {
          duration: SCREEN_ON.run,
          ease: [
            [0.3, 0.85, 0.3, 1],
            [0.33, 0.35, 0.15, 1],
          ],
          times: [0, line, 1],
        },
      }}
      className={cn("relative", className)}
      exit={{
        scaleY: SCREEN_LINE,
        transition: { duration: SCREEN_OFF.collapse, ease: [0.55, 0, 1, 0.45] },
      }}
      initial={reduced ? false : { scaleX: 0, scaleY: SCREEN_LINE }}
      ref={set}
    >
      {children}
      <motion.div
        animate={{
          opacity: [1, 1, 0],
          transition: {
            duration: SCREEN_ON.run,
            ease: POINTS.fade,
            times: [0, line * 1.2, 1],
          },
        }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        exit={{
          opacity: 1,
          transition: { duration: SCREEN_OFF.collapse * 0.7, ease: "easeIn" },
        }}
        initial={reduced ? false : { opacity: 1 }}
        style={{ background: SCREEN_BEAM }}
      />
    </motion.div>
  );
}

const dialogOpen = () =>
  Boolean(document.querySelector("[role='dialog'], [aria-modal='true']")) ||
  getComputedStyle(document.body).overflowY === "hidden" ||
  getComputedStyle(document.documentElement).overflowY === "hidden";

const readingBelow = () => window.scrollY > window.innerHeight * 0.5;

export function Intermission({
  after,
  drift,
  ease,
  enter,
  image,
  label = "Intermission",
  leave,
  paused,
  title,
}: {
  after: number;
  drift: number;
  ease: readonly number[];
  enter: number;
  image: string | null;
  label?: string;
  leave: number;
  paused: boolean;
  title: string;
}) {
  const [resting, setResting] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!image) return;
    let live = true;
    const picture = new Image();
    picture.crossOrigin = "anonymous";
    picture.decoding = "async";
    picture.onload = () => {
      if (live) setLoaded(image);
    };
    picture.src = image;
    return () => {
      live = false;
      picture.onload = null;
    };
  }, [image]);

  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.hidden || houseDown() || dialogOpen() || readingBelow()) {
          return arm();
        }
        setResting(true);
      }, after * 1000);
    };
    const wake = () => {
      setResting(false);
      arm();
    };
    arm();
    SCREEN_WAKE.forEach((name) =>
      window.addEventListener(name, wake, { capture: true, passive: true }),
    );
    return () => {
      clearTimeout(timer);
      SCREEN_WAKE.forEach((name) =>
        window.removeEventListener(name, wake, { capture: true }),
      );
    };
  }, [after, paused]);

  const shown = resting && !paused && image !== null && loaded === image;
  const curve = [ease[0], ease[1], ease[2], ease[3]] as [
    number,
    number,
    number,
    number,
  ];
  const off: TargetAndTransition = reduced
    ? { opacity: 0, transition: { duration: leave / 2, ease: SCREEN_DIM } }
    : passThrough(leave);

  return (
    <AnimatePresence>
      {shown ? (
        <motion.div
          animate={{
            opacity: 1,
            scale: 1,
            transition: { duration: enter, ease: curve },
          }}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden bg-page will-change-[opacity,transform]"
          exit={off}
          initial={{ opacity: 0 }}
          style={{ zIndex: Z_INDEX.DOCK + 5 }}
        >
          <div
            className={
              reduced ? "absolute inset-0" : "film-drift absolute inset-0"
            }
            style={{
              animationDuration: `${drift}s`,
              backgroundImage: `url(${image})`,
              backgroundPosition: "center 30%",
              backgroundSize: "cover",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 120% 100% at 50% 45%, transparent 40%, rgb(0 0 0 / 0.7)), linear-gradient(to top, rgb(0 0 0 / 0.75), transparent 45%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-8 sm:p-12">
            <div className="flex min-w-0 flex-col gap-3">
              <span className="type-micro font-semibold tracking-slate text-ink-muted uppercase">
                {label}
              </span>
              <span className="font-zuume type-display-md leading-none font-bold text-ink uppercase sm:type-display-xl">
                {title}
              </span>
            </div>
            <span className="hidden shrink-0 type-micro font-semibold tracking-slate text-ink-muted uppercase sm:block">
              Move to resume
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const iconFor = (tint: Tint) => {
  const c = `rgb(${rgbOf(tint).join(",")})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0a0a0a"/><rect width="64" height="64" rx="16" fill="${c}" fill-opacity="0.18"/><svg x="14" y="14" width="36" height="36" viewBox="${LOGO_VIEWBOX}"><path fill="${c}" d="${LOGO_PATH}"/></svg></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const icons = () => [
  ...document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"),
];

function paint(tint: Tint | null) {
  const href = tint ? iconFor(tint) : null;
  for (const link of icons()) {
    const untinted = link.getAttribute(SCREEN_UNTINTED);
    if (href) {
      if (untinted === null)
        link.setAttribute(
          SCREEN_UNTINTED,
          JSON.stringify([link.href, link.type]),
        );
      link.type = "image/svg+xml";
      link.href = href;
    } else if (untinted !== null) {
      const [original, type] = JSON.parse(untinted) as [string, string];
      link.href = original;
      link.type = type;
      link.removeAttribute(SCREEN_UNTINTED);
    }
  }
}

export function TintedFavicon() {
  const engine = useEngine();

  useEffect(() => {
    const { target } = gradeOf(engine);
    paint(target.get());
    const stop = target.subscribe(paint);
    return () => {
      stop();
      paint(null);
    };
  }, [engine]);

  return null;
}
