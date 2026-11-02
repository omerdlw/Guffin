"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CURVE } from "../curve";
import { clamp, reach } from "../ladder";
import { useAnyStage, usePartOf } from "../react";
import {
  clearMask,
  expose,
  ExposureLayers,
  setMask,
  useExposure,
} from "./expose";

// A section's heading lit by one head of light crossing the bar: the lamp
// comes on as the head reaches it, the name is printed under it, the rule is
// drawn behind it with a spark at its tip, the actions are wiped in last.
// The crossing is the part's own arrival; cast the part with `enter: "still"`
// so only the light moves, while leaving and depth still apply.

// The lamp warms over a little more than its own width.
const FEATHER = reach(0);
// The name is printed over a little more than its width, so it trails.
const PRINT_SPAN = 1.24;
const SOFT = 14;
const UNWIPED = `linear-gradient(90deg, #000 ${-SOFT}%, transparent 0%)`;

interface Place {
  left: number;
  width: number;
}

export interface HeaderProps {
  part: string;
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  nameClassName?: string;
}

export function Header({
  part,
  title,
  icon,
  actions,
  className,
  nameClassName,
}: HeaderProps) {
  const stage = useAnyStage();
  const bar = useRef<HTMLDivElement>(null);
  const lamp = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const rule = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const spark = useRef<HTMLDivElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const layers = useExposure();
  const places = useRef<Map<HTMLElement, Place> | null>(null);
  const head = useRef(0);

  const placeOf = (el: HTMLElement | null): Place | null => {
    const host = bar.current;
    if (!el || !host) return null;
    places.current ??= new Map();
    let place = places.current.get(el);
    if (!place) {
      const outer = host.getBoundingClientRect();
      const inner = el.getBoundingClientRect();
      place = { left: inner.left - outer.left, width: inner.width };
      places.current.set(el, place);
    }
    return place;
  };

  // How far the head has crossed an element, given how wide its light is.
  const reached = (el: HTMLElement | null, span: (width: number) => number) => {
    const place = placeOf(el);
    if (!place) return 1;
    return clamp(
      (head.current - place.left) / Math.max(1, span(place.width)),
      0,
      1,
    );
  };

  const light = (progress: number) => {
    const width = bar.current?.clientWidth ?? 0;
    head.current = progress * width;

    const lit = CURVE.fade(reached(lamp.current, (w) => w + FEATHER));
    if (lamp.current) {
      lamp.current.style.opacity = lit.toFixed(3);
      lamp.current.style.filter =
        lit >= 1 ? "none" : `blur(${((1 - lit) * 6).toFixed(2)}px)`;
    }

    const exposure = layers.get();
    if (exposure)
      expose(
        exposure,
        reached(name.current, (w) => w * PRINT_SPAN),
        {
          linear: true,
        },
      );

    const drawn = reached(rule.current, (w) => w);
    if (line.current)
      line.current.style.transform = `scaleX(${drawn.toFixed(4)})`;
    if (spark.current) {
      spark.current.style.opacity = (
        drawn <= 0 || drawn >= 1 ? 0 : Math.sin(Math.PI * drawn) ** 0.5
      ).toFixed(3);
      spark.current.style.transform = `translateX(${(drawn * 100).toFixed(3)}%)`;
    }

    const wiped = reached(wipe.current, (w) => w);
    if (wipe.current) {
      if (wiped >= 1) clearMask(wipe.current);
      else {
        const edge = wiped * (100 + SOFT);
        setMask(
          wipe.current,
          `linear-gradient(90deg, #000 ${edge - SOFT}%, transparent ${edge}%)`,
        );
      }
    }
  };

  const props = usePartOf(stage, part, {
    css: true,
    render: (_look, state) => {
      light(state.quiet ? (state.enter > 0 ? 1 : 0) : state.enter);
    },
  });

  useEffect(() => {
    const host = bar.current;
    if (!host) return;
    const forget = new ResizeObserver(() => {
      places.current = null;
    });
    forget.observe(host);
    return () => forget.disconnect();
  }, []);

  return (
    <div {...props} className={className ?? "relative z-10 mb-4"}>
      <div className="flex min-h-8 w-full items-center gap-4" ref={bar}>
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          {icon ? (
            <span
              className="flex shrink-0"
              data-print=""
              ref={lamp}
              style={{ color: "var(--light, currentColor)", opacity: 0 }}
            >
              {icon}
            </span>
          ) : null}
          <h2
            className={nameClassName}
            ref={name}
            style={{ position: "relative" }}
          >
            <ExposureLayers
              text={title}
              print={layers.print}
              light={layers.light}
            />
          </h2>
        </div>
        <div
          aria-hidden="true"
          className="relative h-2 min-w-6 flex-1"
          ref={rule}
        >
          <div className="absolute inset-x-0 top-1/2 h-px">
            <div
              className="absolute inset-0 origin-left"
              data-print=""
              ref={line}
              style={{
                transform: "scaleX(0)",
                background:
                  "color-mix(in oklch, var(--light, #fcfcfb) 20%, transparent)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-full"
              ref={spark}
              style={{ opacity: 0 }}
            >
              <span
                className="absolute -top-px right-full h-[3px] w-16 blur-[1.5px]"
                style={{
                  background:
                    "linear-gradient(to right, transparent, color-mix(in oklch, var(--light, #fcfcfb) 90%, transparent))",
                }}
              />
            </div>
          </div>
        </div>
        {actions ? (
          <div
            className="min-w-0"
            data-print=""
            ref={wipe}
            style={{ maskImage: UNWIPED, WebkitMaskImage: UNWIPED }}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
