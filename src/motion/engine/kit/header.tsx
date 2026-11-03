"use client";

import { useRef, type ReactNode } from "react";
import { CURVE, elapsed } from "../curve";
import { PHI, clamp, haze, reach } from "../ladder";
import { useAnyStage, usePartOf } from "../react";
import { letters, words } from "../text";
import { clearMask, setMask } from "./expose";

// A section's heading, taken apart and put together again piece by piece: the
// lamp comes on, the name is spelled out letter by letter, the rule is drawn
// out of it, and the actions step in one after another. The pieces are not one
// band of light crossing a bar; each has its own place in the part's arrival,
// they overlap like beats of a score, and each comes out of the soft by its own
// blur, travel and opacity.
//
// The whole heading is one part and its arrival is the clock: every piece
// reads its own window of that arrival, so nothing here measures the page, and
// the same heading always plays the same sequence. Cast the part with
// `enter: "still"` so only the pieces move, while leaving and depth still
// apply.

// Where each piece plays in the arrival, as shares of it (0 → 1). They
// overlap: the name starts spelling while the lamp is still coming on.
const LAMP = [0, 0.3] as const;
const NAME = [0.1, 0.65] as const;
const RULE = [0.3, 0.85] as const;
const ACTIONS = [0.5, 1] as const;
// The wipe that opens the actions' block leads the pieces, and it is laid on
// the clock (not on the part's eased progress, which is front-loaded). Its soft
// edge is this wide, in % of the block.
const WIPE = [0.25, 0.85] as const;
const WIPE_EDGE = 32;
// The wipe's mask clips to the block's box, so the block has room all round
// (taken back in its margin) for the pieces' blur and shadows to spill into.
const ROOM = "0.5rem";

// The share of its window each letter (or action) takes to come in; the rest
// of the window is the wait for the ones after it.
const LETTER_SHARE = 0.45;
const ACTION_SHARE = 0.5;

const TAKES_A_HAND =
  'button, a[href], [role="tab"], [role="combobox"], [role="switch"]';

type Window = readonly [from: number, to: number];

const within = (progress: number, [from, to]: Window) =>
  clamp((progress - from) / (to - from), 0, 1);

// The i-th of n pieces within a window: they start evenly across it, and each
// takes `share` of it.
function staggered(
  progress: number,
  window: Window,
  i: number,
  n: number,
  share: number,
) {
  const [from, to] = window;
  const span = to - from;
  const run = span * share;
  const start = from + (n > 1 ? i / (n - 1) : 0) * (span - run);
  return clamp((progress - start) / run, 0, 1);
}

// The actions' block is wiped open from left to right, a little ahead of the
// pieces, so a control's track and pill (which are not pieces) are never seen
// bare before their tabs: whatever the wipe has not reached is not there.
function wipe(host: HTMLElement, reached: number) {
  if (reached <= 0) {
    clearMask(host);
    host.style.opacity = "0";
    return;
  }
  host.style.removeProperty("opacity");
  if (reached >= 1) {
    clearMask(host);
    return;
  }
  const edge = (100 + WIPE_EDGE) * reached;
  setMask(
    host,
    `linear-gradient(90deg, #000 ${edge - WIPE_EDGE}%, transparent ${edge}%)`,
  );
}

// A piece that comes out of the soft: opacity lands first, travel and blur
// finish with the movement.
function come(el: HTMLElement, t: number, rung: number, travel: number) {
  if (t >= 1) {
    el.style.removeProperty("opacity");
    el.style.removeProperty("filter");
    el.style.removeProperty("transform");
    return;
  }
  const eased = CURVE.silk(t);
  el.style.opacity = clamp(eased * PHI, 0, 1).toFixed(3);
  el.style.filter = `blur(${((1 - eased) * haze(rung)).toFixed(2)}px)`;
  el.style.transform = `translate3d(0, ${((1 - eased) * travel).toFixed(2)}px, 0)`;
}

// What a heading's actions are made of: its buttons, tabs and links, not the
// elements around them.
function handsOf(host: HTMLElement) {
  const found = Array.from(host.querySelectorAll<HTMLElement>(TAKES_A_HAND));
  const own = found.filter(
    (el) => !found.some((other) => other !== el && other.contains(el)),
  );
  return own.length > 0 ? own : [host];
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
  const lamp = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const spark = useRef<HTMLDivElement>(null);
  const hands = useRef<HTMLDivElement>(null);

  const play = (progress: number) => {
    if (lamp.current) come(lamp.current, within(progress, LAMP), 3, reach(-3));

    if (name.current) {
      const spelled =
        name.current.querySelectorAll<HTMLElement>("[data-letter]");
      spelled.forEach((letter, i) =>
        come(
          letter,
          staggered(progress, NAME, i, spelled.length, LETTER_SHARE),
          3,
          reach(-3),
        ),
      );
    }

    const drawn = CURVE.silk(within(progress, RULE));
    if (line.current)
      line.current.style.transform = `scaleX(${drawn.toFixed(4)})`;
    if (spark.current) {
      spark.current.style.opacity = (
        drawn <= 0 || drawn >= 1 ? 0 : Math.sin(Math.PI * drawn) ** 0.5
      ).toFixed(3);
      spark.current.style.transform = `translateX(${(drawn * 100).toFixed(3)}%)`;
    }

    const host = hands.current;
    if (host) {
      wipe(host, CURVE.glide(within(elapsed(CURVE.silk, progress), WIPE)));
      const pieces = handsOf(host);
      pieces.forEach((piece, i) =>
        come(
          piece,
          staggered(progress, ACTIONS, i, pieces.length, ACTION_SHARE),
          2,
          reach(-3),
        ),
      );
    }
  };

  const props = usePartOf(stage, part, {
    css: true,
    render: (_look, state) => {
      play(state.quiet ? (state.enter > 0 ? 1 : 0) : state.enter);
    },
  });

  const spoken = words(title);

  return (
    <div {...props} className={className ?? "relative z-10 mb-4"}>
      <div className="flex min-h-8 w-full items-center gap-4">
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
            aria-label={title}
            className={nameClassName}
            ref={name}
            style={{ position: "relative" }}
          >
            {spoken.map((word, i) => (
              <span aria-hidden="true" key={i}>
                <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                  {letters(word).map((letter, j) => (
                    <span
                      data-letter=""
                      data-print=""
                      key={j}
                      style={{ display: "inline-block", opacity: 0 }}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
                {i < spoken.length - 1 ? " " : null}
              </span>
            ))}
          </h2>
        </div>
        <div aria-hidden="true" className="relative h-2 min-w-6 flex-1">
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
            ref={hands}
            style={{ margin: `-${ROOM}`, opacity: 0, padding: ROOM }}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
