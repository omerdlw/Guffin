// The physics shared by the controls whose thumb turns to liquid glass (the
// segmented control's indicator, the switch's knob): springs stepped at a
// fixed rate on one animation frame loop that stops when everything rests.

export interface Spring {
  v: number;
  x: number;
}

export interface Feel {
  damping: number;
  stiffness: number;
}

/** A goal for one frame: pull `spring` towards `to` with `feel`. */
export type Goal = readonly [spring: Spring, to: number, feel: Feel];

export const spring = (x = 0): Spring => ({ v: 0, x });

export const feel = (stiffness: number, ratio: number): Feel => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});

const STEP = 1 / 240;
const MOST = 1 / 20;
/** Rest: a scale of 1.001 is a third of a pixel on a wide row. */
const STILL = 0.001;

/**
 * Runs `goals` (read afresh every frame) until every spring rests, calling
 * `draw` after each frame. `instant` snaps the springs (reduced motion).
 */
export function drive(
  goals: () => readonly Goal[],
  draw: (dt: number) => void,
  instant: () => boolean,
) {
  let raf = 0;
  let last = 0;
  let owed = 0;

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MOST);
    last = now;
    const list = goals();
    if (instant()) {
      for (const [state, to] of list) {
        state.x = to;
        state.v = 0;
      }
    } else {
      owed += dt;
      while (owed >= STEP) {
        owed -= STEP;
        for (const [state, to, { damping, stiffness }] of list) {
          state.v += ((to - state.x) * stiffness - state.v * damping) * STEP;
          state.x += state.v * STEP;
        }
      }
    }
    const resting = list.every(
      ([state, to]) =>
        Math.abs(state.v) < STILL && Math.abs(state.x - to) < STILL,
    );
    // Stopping, each spring lands exactly on its goal, so nothing is left
    // drawn a hair off (a press that ends at 1.005 instead of 1).
    if (resting) {
      for (const [state, to] of list) {
        state.x = to;
        state.v = 0;
      }
    }
    draw(dt);
    raf = resting ? 0 : requestAnimationFrame(frame);
  };

  return {
    stop: () => cancelAnimationFrame(raf),
    wake: () => {
      if (raf) return;
      last = performance.now();
      owed = 0;
      raf = requestAnimationFrame(frame);
    },
  };
}

export const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(n, high));

/** Pointer travel (px) before a press becomes a drag. */
export const DRAG_SLOP = 3;

/**
 * The thumb's transform: moved along by `x`, swelled by `sx`, `sy`. A swell
 * all but gone (the springs stop within a hair of rest) is dropped, so the
 * thumb at rest draws one to one.
 */
export function thumbTransform(x: number, sx: number, sy: number) {
  const moved = `translateX(${x.toFixed(2)}px)`;
  return Math.abs(sx - 1) < 0.004 && Math.abs(sy - 1) < 0.004
    ? moved
    : `${moved} scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}

/**
 * The thumb's depth as it turns to glass (`g`, 0 solid → 1 glass), written
 * to `--liquid-drop`: over a flat track there is little to bend, so what
 * makes the drop read as glass is its body. It lifts on a deeper shadow, its
 * top edge catches a line of light and its foot a soft inner shade. At 0 it
 * is the knob's resting shadow, one to one.
 */
export function glassDepth(g: number) {
  const f = (n: number, digits = 2) => n.toFixed(digits);
  return [
    `0 ${f(1 + 5 * g)}px ${f(3 + 13 * g)}px ${f(-4 * g)}px rgb(0 0 0 / ${f(0.2 + 0.14 * g, 3)})`,
    `inset 0 1px 0.5px rgb(255 255 255 / ${f(0.6 * g, 3)})`,
    `inset 0 0 0 0.5px rgb(255 255 255 / ${f(0.3 * g, 3)})`,
    `inset 0 -3px 6px -2px rgb(0 0 0 / ${f(0.14 * g, 3)})`,
  ].join(", ");
}

/**
 * Lays a lens thumb out swelled for real: its box grows about its middle to
 * `sx`, `sy` times `width` × `height` and moves along by `x`. Not a scale:
 * the lens's maps are laid out for the box the element has, and under a
 * scale the backdrop it bends is not that box, so the rim tore what it bent.
 * Sized, the lens, its glint and its corners follow every frame.
 */
export function swellBox(
  element: HTMLElement,
  x: number,
  width: number,
  height: number,
  sx: number,
  sy: number,
) {
  // A swell all but gone draws one to one (see thumbTransform).
  const still = Math.abs(sx - 1) < 0.004 && Math.abs(sy - 1) < 0.004;
  const w = still ? width : width * sx;
  const h = still ? height : height * sy;
  const f = (n: number) => n.toFixed(2);
  element.style.width = `${f(w)}px`;
  element.style.height = `${f(h)}px`;
  element.style.transform = `translate(${f(x - (w - width) / 2)}px, ${f(-(h - height) / 2)}px)`;
}
