"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
  useReducedMotion,
} from "motion/react";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/design/components/logo";
import { Z_INDEX } from "@/design/foundations/z-index";
import { houseDown } from "@/design/components/room";
import { grade, rgbOf, type Tint } from "@/design/grade";

type Bezier = [number, number, number, number];

const SCREEN_WAKE = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

const SCREEN_THROUGH = 1.06;

const SCREEN_DIM: Bezier = [0.3, 0, 0.2, 1];

const SCREEN_DOLLY: Bezier = [0.5, 0, 0.12, 1];

const SCREEN_UNTINTED = "data-untinted";

function passThrough(run: number): TargetAndTransition {
  return {
    opacity: 0,
    scale: SCREEN_THROUGH,
    transition: {
      duration: run,
      opacity: { duration: run, ease: SCREEN_DIM },
      scale: { duration: run, ease: SCREEN_DOLLY },
    },
  };
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
  useEffect(() => {
    paint(grade.get());
    const stop = grade.subscribe(paint);
    return () => {
      stop();
      paint(null);
    };
  }, []);

  return null;
}
