import type {
  DockMotion,
  DockSurfacePhaseMotion,
} from "@omerdlw/base-framework/dock";
import { gpuTransform } from "@omerdlw/base-framework/utils";
import {
  DEVELOP,
  LEAVE,
  SETTLE,
  STAGGER,
  TOUCH,
  TRAVEL,
  at,
  away,
  beat,
  here,
  spring,
  tween,
} from "./motion";

/** The dock's resting width in px; the framework clamps it to the viewport. */
export const DOCK_WIDTH = 520;

/** The dock card's padding in px (p-3 in theme/dock.ts). */
export const DOCK_PADDING = 12;

// The dock's choreography. Everything the dock does on screen is timed here;
// the dock's CSS (styles/dock.css) adds only what motion tokens can't reach:
// its rise on arrival, the lift under the pointer and the deck's fold.
//
// The dock speaks the site's proportion, the golden ratio: durations are
// powers of φ seconds, staggers Fibonacci milliseconds, travel Fibonacci
// pixels, curves drawn from φ's fractions. It is quicker than a
// page, because it answers the hand, but it never snaps.
//
// Three ideas run through it:
// - Glass moves like a body. The stack, the cards and the surface resize and
//   travel on critically damped springs, so a move that is interrupted keeps
//   its momentum instead of restarting, and nothing wobbles.
// - Words move like credits rolling. A title, a description, an icon, a
//   header: the outgoing one lifts away and fades, the incoming one rises in
//   a beat behind it.
// - A surface opens and closes as one breath. Opening, the card's own
//   header and action lift away while the glass draws in a hair; then the
//   glass blooms to its new size and the surface surfaces into it. Closing,
//   the glass gathers, the body sinks out, and the header settles back in.
//
// Nothing blurs, glass or words: a blurring animation cannot run on the
// compositor, so it repaints on every frame it plays, and on frosted glass it
// smears the frost.

// The glass travels on these.
const GLIDE = spring(beat(-1));
const FAN = spring(beat(-1), 0.12);
const NUDGE = spring(beat(-2));

// A resize takes longer the farther it goes, so a step and a leap both read
// at the same speed: √distance, from 0.382s to 1s.
const resize = (distancePx: number) =>
  spring(
    Math.min(
      beat(0),
      Math.max(beat(-2), beat(-1) * Math.sqrt(Math.max(distancePx, 0) / 233)),
    ),
  );

// For words and glyphs. In from below, out through the top.
const lift = (travel: number, enter = tween(beat(-2), SETTLE)) => ({
  hidden: away(travel),
  visible: { ...here(), transition: enter },
  exit: { ...away(-travel), transition: tween(beat(-3), LEAVE) },
});

// The surface's body: rises into the opened glass and sinks out of it.
const SURFACE_IN = tween(beat(-1), SETTLE, beat(-4));
const SURFACE_OUT = tween(beat(-3), LEAVE);

// The card's own header, coming back after a surface closes.
const HEADER_RETURN = tween(beat(-1), SETTLE, STAGGER.line);

const REST_PHASE: DockSurfacePhaseMotion = {
  deck: null,
  transform: null,
  scale: 1,
  body: SURFACE_IN,
  header: tween(beat(-2), SETTLE),
  headerReturn: null,
};

// How far the glass draws in before it blooms or lets go.
const INHALE = 0.985;

// A back or action control slides open beside the close button.
const controlSlot = {
  hidden: { opacity: 0, width: 0, marginRight: -2, transform: at(0, 0.6) },
  visible: {
    opacity: 1,
    width: "auto",
    marginRight: 0,
    transform: at(),
    transition: {
      width: NUDGE,
      marginRight: NUDGE,
      transform: spring(beat(-2), 0.2),
      opacity: tween(beat(-3), SETTLE, STAGGER.item),
    },
  },
  exit: {
    opacity: 0,
    width: 0,
    marginRight: -2,
    transform: at(0, 0.6),
    transition: {
      opacity: tween(beat(-4), LEAVE),
      width: spring(beat(-2)),
      marginRight: spring(beat(-2)),
      transform: tween(beat(-3), LEAVE),
    },
  },
};

export const dockMotion: DockMotion = {
  transitions: {
    stack: GLIDE,
    expand: GLIDE,
    surfaceExit: SURFACE_OUT,
    layout: NUDGE,
    card: GLIDE,
    cardExpanded: FAN,
    cardPeek: NUDGE,
    // The banner behind the active card develops like a print.
    fade: tween(beat(0), DEVELOP),
    text: tween(beat(-2), SETTLE),
    headerSwap: tween(beat(-1), SETTLE),
    actionDismiss: tween(beat(-3), LEAVE),
    icon: tween(beat(-2), SETTLE),
    badge: spring(beat(-2), 0.3),
    hud: tween(beat(-2), SETTLE),
    press: spring(beat(-3), 0.3),
    scrubberTooltip: tween(beat(-3), SETTLE),
    scrubberFollow: { stiffness: 320, damping: 36, mass: 0.6 },
    // Runs as a CSS transition (width, left): must stay a tween.
    mediaVolume: tween(beat(-4), TOUCH),
  },
  variants: {
    // Titles, and the card body when a HUD takes its place.
    fade: lift(TRAVEL.step),
    // The action under a header and the status card's actions.
    textCrossfade: lift(TRAVEL.nudge, tween(beat(-2), SETTLE, beat(-4))),
    // A line behind its title, at its own reading opacity.
    description: (opacity = 0.7) => ({
      hidden: away(TRAVEL.nudge),
      visible: {
        ...here(opacity),
        transition: tween(beat(-2), SETTLE, STAGGER.line),
      },
      exit: {
        ...away(-TRAVEL.nudge),
        transition: tween(beat(-3), LEAVE),
      },
    }),
    // The surface's header rising into the card.
    headerSwap: lift(TRAVEL.rise, tween(beat(-1), SETTLE, beat(-4))),
    // The card's own header: it lifts away when a surface opens (hidden) and
    // settles back down from above when it closes.
    headerRestore: {
      hidden: away(-TRAVEL.step),
      visible: { ...here(), transition: HEADER_RETURN },
      exit: { ...away(TRAVEL.step), transition: SURFACE_OUT },
    },
    extensionShelf: lift(TRAVEL.step),
    actionDismiss: {
      hidden: away(TRAVEL.step, 0.96),
      visible: here(),
      exit: {
        ...away(TRAVEL.step, 0.96),
        transition: tween(beat(-3), LEAVE),
      },
    },
    // Page commands arrive one after another, left to right.
    commandBar: {
      hidden: away(TRAVEL.nudge, 0.9),
      visible: (index: unknown = 0) => ({
        ...here(),
        transition: tween(
          beat(-2),
          SETTLE,
          Math.min(Number(index) || 0, 4) * STAGGER.line,
        ),
      }),
      exit: {
        ...away(-TRAVEL.hair, 0.9),
        transition: tween(beat(-4), LEAVE),
      },
    },
    // A glyph or poster swapping: the old one swells and fades, the new one
    // settles in from a step back.
    icon: {
      hidden: away(0, 0.84),
      visible: { ...here(), transition: tween(beat(-2), SETTLE) },
      exit: { ...away(0, 1.12), transition: tween(beat(-3), LEAVE) },
    },
    badge: {
      hidden: away(0, 0.5),
      visible: {
        ...here(),
        transition: {
          transform: spring(beat(-2), 0.35),
          opacity: tween(beat(-3), SETTLE),
        },
      },
      exit: { ...away(0, 0.7), transition: tween(beat(-4), LEAVE) },
    },
    hud: lift(TRAVEL.step),
    scrubberTooltip: {
      hidden: away(-TRAVEL.hair, 0.94),
      visible: { ...here(), transition: tween(beat(-3), SETTLE) },
      exit: { ...away(-TRAVEL.hair, 0.94), transition: tween(beat(-4), LEAVE) },
    },
    // The trail drops in under the stack once the stack has lifted for it.
    breadcrumbs: {
      hidden: away(-TRAVEL.step, 0.96),
      visible: {
        ...here(),
        transition: {
          transform: { ...spring(beat(-1), 0.1), delay: beat(-4) },
          opacity: tween(beat(-2), SETTLE, beat(-4)),
        },
      },
      exit: {
        ...away(-TRAVEL.nudge, 0.98),
        transition: tween(beat(-3), LEAVE),
      },
    },
    // The page dims slowly, like house lights, and comes back sooner.
    backdrop: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: tween(beat(-1), DEVELOP) },
      exit: { opacity: 0, transition: tween(beat(-2), LEAVE) },
    },
    // The surface's body rises into the opened glass and sinks out of it.
    surfaceBody: {
      hidden: away(TRAVEL.rise),
      visible: here(),
      exit: away(TRAVEL.step),
    },
    // The floating controls bloom above the surface once its body is in.
    controlsContainer: {
      hidden: (y: unknown = 0) => ({
        opacity: 0,
        transform: at((Number(y) || 0) + TRAVEL.step, 0.92),
      }),
      visible: (y: unknown = 0) => ({
        opacity: 1,
        transform: at(Number(y) || 0),
        transition: {
          opacity: tween(beat(-3), SETTLE, beat(-4)),
          transform: spring(beat(-1), 0.15),
        },
      }),
      exit: (y: unknown = 0) => ({
        opacity: 0,
        transform: at((Number(y) || 0) + TRAVEL.nudge, 0.96),
        transition: {
          opacity: tween(beat(-4), LEAVE),
          transform: tween(beat(-3), LEAVE),
        },
      }),
    },
    controlsAction: controlSlot,
    controlsBack: controlSlot,
    controlsClose: {
      hidden: away(0, 0.6),
      visible: {
        ...here(),
        transition: {
          transform: spring(beat(-2), 0.2),
          opacity: tween(beat(-3), SETTLE),
        },
      },
      exit: { ...away(0, 0.6), transition: tween(beat(-4), LEAVE) },
    },
    press: {
      idle: { scale: 1 },
      hover: { scale: 1 },
      tap: { scale: 0.96 },
    },
    mediaVolumeThumb: {
      idle: { scale: 1, transition: spring(beat(-3)) },
      dragging: { scale: 1.3, transition: spring(beat(-3), 0.3) },
    },
    // The words on a card behind the front one, while the stack is shut.
    cardContent: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  phases: {
    idle: REST_PHASE,
    // Opening, 1: the header and action lift away; the glass draws in.
    dismissAction: {
      ...REST_PHASE,
      transform: tween(beat(-3), SETTLE),
      scale: INHALE,
      header: tween(beat(-3), LEAVE),
    },
    // Opening, 2: the glass blooms to the surface's size; the body rises in.
    expandBody: {
      ...REST_PHASE,
      deck: spring(beat(-1)),
      transform: spring(beat(-1), 0.12),
      body: SURFACE_IN,
    },
    // Open: steps inside the surface resize by how far they go.
    open: { ...REST_PHASE, deck: resize },
    // Closing, 1: the glass gathers.
    anticipation: {
      ...REST_PHASE,
      deck: resize,
      transform: tween(beat(-4), TOUCH),
      scale: INHALE,
    },
    // Closing, 2: the body sinks out, the glass lets go and shrinks back,
    // and the header settles in.
    collapseBody: {
      ...REST_PHASE,
      deck: GLIDE,
      transform: spring(beat(-1), 0.1),
      headerReturn: HEADER_RETURN,
    },
    restoreHeader: { ...REST_PHASE, deck: GLIDE },
  },
  deck: {
    elevation: {
      rest: "none",
      elevated: "none",
    },
    // Only the front card shows at rest, so there is nothing to peek at.
    peek: () => ({ lift: 0, scale: 1 }),
    // A card that leaves (a surface closing, a status passing) fades where
    // it stands, quickly: the card taking its place is already there, and
    // two panes of glass must never be seen on top of each other.
    exit: ({ y, scale }) => ({
      opacity: 0,
      transform: gpuTransform(y, scale ?? 1),
      transition: tween(beat(-4), LEAVE),
    }),
    tapScale: 0.98,
    stacking: {
      collapsed: {
        offsetY: -10,
        scale: 0.88,
        opacityStep: 0.2,
        opacityMin: 0.1,
      },
      // One card's height (48px header + padding on both sides) plus a 4px gap.
      expanded: { offsetY: -(48 + DOCK_PADDING * 2 + 4) },
      // The shelf shows exactly its bar (45px, theme/dock.ts) above the
      // surface, at its scale: less and the surface covers the bar's foot,
      // and its control sits closer to the surface than to the shelf's top.
      // gpuTransform rounds the lift to whole pixels, so the scale is the
      // one that makes the bar a whole 42px.
      shelf: { offsetY: -42, scale: 42 / 45 },
      // Only the front card shows at rest; the rest wait for the stack to open.
      visible: { stack: 1, extensions: 2, status: 1 },
    },
    breadcrumbOffset: -44,
    fullscreenOpacity: 0,
    origin: "50% 100%",
    resizeFallback: 260,
    width: DOCK_WIDTH,
    // The card's p-3 (theme/dock.ts): the framework sizes the card to its
    // content plus this above and below.
    padding: DOCK_PADDING,
  },
  opacity: { banner: 0.95, description: 0.7 },
  // A surface dragged down shrinks and dims under the finger.
  drag: {
    elastic: { top: 0.05, bottom: 0.5 },
    range: [0, 180],
    opacity: [1, 0.55],
    scale: [1, 0.94],
    dismiss: { offset: 65, velocity: 400 },
  },
  skeleton: "",
  timings: {
    // Holds between surface phases, in seconds.
    dismissAction: beat(-3),
    anticipation: beat(-4),
    expandBody: beat(-2),
    collapseBody: beat(-3),
    restoreHeader: beat(-3),
    // The deck fans open from the front, one card after another.
    expandStagger: STAGGER.item,
    expandStaggerCap: beat(-4),
    peekStagger: 0,
    peekStaggerCap: 0,
    staggerExponent: 1,
  },
};
