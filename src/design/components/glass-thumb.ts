export interface Spring {
  v: number;
  x: number;
}

export interface Feel {
  damping: number;
  stiffness: number;
}

export type Goal = readonly [spring: Spring, to: number, feel: Feel];

export const spring = (x = 0): Spring => ({ v: 0, x });

export const feel = (stiffness: number, ratio: number): Feel => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});

const STEP = 1 / 240;
const MOST = 1 / 20;
const STILL = 0.001;

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

export const DRAG_SLOP = 3;

export const SWELL_MAX = 10;

export const SWELL_REACH = SWELL_MAX / 2;

export function thumbTransform(x: number, sx: number, sy: number) {
  const moved = `translateX(${x.toFixed(2)}px)`;
  return Math.abs(sx - 1) < 0.004 && Math.abs(sy - 1) < 0.004
    ? moved
    : `${moved} scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}

export function glassDepth(g: number) {
  const f = (n: number, digits = 2) => n.toFixed(digits);
  return [
    `0 ${f(1 + 5 * g)}px ${f(3 + 13 * g)}px ${f(-4 * g)}px rgb(0 0 0 / ${f(0.2 + 0.14 * g, 3)})`,
    `inset 0 1px 0.5px rgb(255 255 255 / ${f(0.6 * g, 3)})`,
    `inset 0 0 0 0.5px rgb(255 255 255 / ${f(0.3 * g, 3)})`,
    `inset 0 -3px 6px -2px rgb(0 0 0 / ${f(0.14 * g, 3)})`,
  ].join(", ");
}

export function swellBox(
  element: HTMLElement,
  x: number,
  width: number,
  height: number,
  sx: number,
  sy: number,
) {
  const still = Math.abs(sx - 1) < 0.004 && Math.abs(sy - 1) < 0.004;
  const w = still ? width : width * sx;
  const h = still ? height : height * sy;
  const f = (n: number) => n.toFixed(2);
  element.style.width = `${f(w)}px`;
  element.style.height = `${f(h)}px`;
  element.style.transform = `translate(${f(x - (w - width) / 2)}px, ${f(-(h - height) / 2)}px)`;
}
