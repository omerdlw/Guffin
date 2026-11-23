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

export const DOCK_WIDTH = 520;

const DOCK_PADDING = 12;

const GLIDE = spring(beat(-0.5));
const FAN = spring(beat(-0.5));
const NUDGE = spring(beat(-2));

const resize = (distancePx: number) =>
  spring(
    Math.min(
      beat(0),
      Math.max(beat(-1.5), beat(-1) * Math.sqrt(Math.max(distancePx, 0) / 233)),
    ),
  );

const lift = (travel: number, enter = tween(beat(-2), SETTLE)) => ({
  hidden: away(travel),
  visible: { ...here(), transition: enter },
  exit: { ...away(-travel), transition: tween(beat(-3), LEAVE) },
});

const SURFACE_IN = tween(beat(-1), SETTLE, beat(-4));
const SURFACE_OUT = tween(beat(-2.5), DEVELOP);

const HEADER_RETURN = tween(beat(-1), SETTLE, STAGGER.line);

const REST_PHASE: DockSurfacePhaseMotion = {
  deck: null,
  transform: null,
  scale: 1,
  body: SURFACE_IN,
  header: tween(beat(-2), SETTLE),
  headerReturn: null,
};

const INHALE = 0.985;

// Hovering the front card fans the page cards out behind it as a stack, so
// the dock shows there is more than the current page. At rest the back cards
// sit tucked behind the front one, small and clear; on hover each grows and
// rises to its place in the stack.
const STACK_REST = { offsetY: -10, scale: 0.8 } as const;
// Every back card shows the same strip above the one in front of it, and
// shrinks by exactly that strip on each side, so the cards step back as even,
// concentric bands.
const STACK_PEEK = { gap: 8, fade: 0.78 } as const;

const peek = (position: number) => ({
  lift: position * (STACK_PEEK.gap + STACK_REST.offsetY),
  scale:
    (1 - (position * STACK_PEEK.gap * 2) / DOCK_WIDTH) /
    STACK_REST.scale ** position,
  opacity: STACK_PEEK.fade ** position,
});

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
    mediaVolume: tween(beat(-4), TOUCH),
  },
  variants: {
    fade: lift(TRAVEL.step),
    textCrossfade: lift(TRAVEL.nudge, tween(beat(-2), SETTLE, beat(-4))),
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
    headerSwap: lift(TRAVEL.rise, tween(beat(-1), SETTLE, beat(-4))),
    headerRestore: {
      hidden: away(-TRAVEL.step),
      visible: { ...here(), transition: HEADER_RETURN },
      exit: { ...away(TRAVEL.step), transition: SURFACE_OUT },
    },
    extensionShelf: {},
    actionDismiss: {
      hidden: away(TRAVEL.step, 0.96),
      visible: here(),
      exit: {
        ...away(TRAVEL.step, 0.96),
        transition: tween(beat(-3), LEAVE),
      },
    },
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
    compact: {
      hidden: away(0, 0.92),
      visible: { ...here(), transition: tween(beat(-1), SETTLE, beat(-4)) },
      exit: { ...away(0, 0.96), transition: tween(beat(-3), LEAVE) },
    },
    backdrop: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: tween(beat(-1), DEVELOP) },
      exit: { opacity: 0, transition: tween(beat(-2), LEAVE) },
    },
    surfaceBody: {
      hidden: away(TRAVEL.rise, 0.985),
      visible: here(),
      exit: away(TRAVEL.nudge, 0.99),
    },
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
          transform: spring(beat(-1)),
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
    cardContent: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  phases: {
    idle: REST_PHASE,
    dismissAction: {
      ...REST_PHASE,
      transform: tween(beat(-3), SETTLE),
      scale: INHALE,
      header: tween(beat(-3), LEAVE),
    },
    expandBody: {
      ...REST_PHASE,
      deck: resize,
      transform: spring(beat(-1)),
      body: SURFACE_IN,
    },
    open: { ...REST_PHASE, deck: resize },
    anticipation: {
      ...REST_PHASE,
      deck: resize,
      transform: tween(beat(-4), TOUCH),
      scale: INHALE,
    },
    collapseBody: {
      ...REST_PHASE,
      deck: GLIDE,
      transform: spring(beat(-1)),
      headerReturn: HEADER_RETURN,
    },
    restoreHeader: { ...REST_PHASE, deck: GLIDE },
  },
  deck: {
    elevation: {
      rest: "none",
      elevated: "none",
    },
    peek,
    exit: ({ y, scale }) => ({
      opacity: 0,
      transform: gpuTransform(y, scale ?? 1),
      transition: tween(beat(-4), LEAVE),
    }),
    tapScale: 0.98,
    heightVar: false,
    stacking: {
      collapsed: {
        offsetY: STACK_REST.offsetY,
        scale: STACK_REST.scale,
        opacityStep: 0.2,
        opacityMin: 0.1,
      },
      expanded: { offsetY: -(48 + DOCK_PADDING * 2 + 4) },
      shelf: { offsetY: 0, scale: 1 },
      visible: { stack: 1, extensions: 2, status: 1 },
    },
    breadcrumbOffset: -44,
    fullscreenOpacity: 0,
    origin: "50% 100%",
    resizeFallback: 260,
    width: DOCK_WIDTH,
    padding: DOCK_PADDING,
  },
  opacity: { banner: 0.95, description: 0.7 },
  drag: {
    elastic: { top: 0.05, bottom: 0.5 },
    range: [0, 180],
    opacity: [1, 0.55],
    scale: [1, 0.94],
    dismiss: { offset: 65, velocity: 400 },
  },
  skeleton: "",
  timings: {
    dismissAction: beat(-3),
    anticipation: beat(-4),
    expandBody: beat(-2),
    collapseBody: beat(-3),
    restoreHeader: beat(-3),
    expandStagger: STAGGER.item,
    expandStaggerCap: beat(-4),
    peekStagger: STAGGER.item,
    peekStaggerCap: beat(-4),
    staggerExponent: 1,
    pendingSkeleton: beat(-4),
  },
};
