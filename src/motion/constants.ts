import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import type { CSSProperties } from "react";
import type {
  Bezier,
  CursorMode,
  CursorReading,
  CursorShape,
  Matter,
  Phase,
  Pointer,
  Projector,
  Verb,
} from "./types";

export const CARRY_FADE_RUNG = 0;

export const CARRY_LAYER = Z_INDEX.DOCK_BACKDROP - 10;

export const TINT_LIGHTNESS = 0.74;

export const TINT_CHROMA = 0.1;

export const TINT_RUNG = 3;

export const TINT_WHITE = 0.985;

/** The no-picture end of the grade on a light page: the ink. */
export const TINT_WHITE_PAPER = 0.22;

export const TINT_HUES = 24;

export const TINT_MIN_CHROMA = 0.02;

export const TINT_READ_WIDTH = 48;

export const LADDER_RUNGS = [
  -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6,
] as const;

export const LADDER_HAZE_RUNGS = [-1, 0, 1, 2, 3, 4, 5, 6] as const;

export const CURSOR_SHAPES: Record<Exclude<CursorMode, "none">, CursorShape> = {
  action: {
    bracket: 0,
    caption: 0,
    dot: 0,
    glass: 1,
    h: 0,
    label: 0,
    r: 0,
    solid: 0,
    w: 0,
  },
  card: {
    bracket: 1,
    caption: 1,
    dot: 1,
    glass: 0,
    h: 0,
    label: 0,
    r: 4,
    solid: 0,
    w: 0,
  },
  drag: {
    bracket: 0,
    caption: 0,
    dot: 0,
    glass: 1,
    h: 46,
    label: 1,
    r: 23,
    solid: 0,
    w: 96,
  },
  frame: {
    bracket: 1,
    caption: 0,
    dot: 1,
    glass: 0,
    h: 116,
    label: 0,
    r: 4,
    solid: 0,
    w: 116,
  },
  idle: {
    bracket: 0,
    caption: 0,
    dot: 1,
    glass: 1,
    h: 34,
    label: 0,
    r: 17,
    solid: 0,
    w: 34,
  },
  text: {
    bracket: 0,
    caption: 0,
    dot: 0,
    glass: 0,
    h: 26,
    label: 0,
    r: 1,
    solid: 1,
    w: 2,
  },
  wrap: {
    bracket: 1,
    caption: 0,
    dot: 1,
    glass: 0,
    h: 0,
    label: 0,
    r: 4,
    solid: 0,
    w: 0,
  },
};

export const CURSOR_LABELS: Partial<Record<CursorMode, string>> = {
  card: "View",
  drag: "Drag",
};

export const CURSOR_TEXT_INPUT =
  "input:not([type=button],[type=checkbox],[type=file],[type=image],[type=radio],[type=range],[type=reset],[type=submit]), textarea, [contenteditable=''], [contenteditable='true']";

export const CURSOR_OWNER = `[data-cursor], [data-dragging], ${CURSOR_TEXT_INPUT}, a[href], button, summary, select, label, [role='button'], [role='link'], [role='tab'], [role='switch'], [role='menuitem']`;

export const CURSOR_WRAP = 7;

export const CURSOR_FRAMING = 14;

export const CURSOR_CARD_FRAMING = 6;

export const CURSOR_SLATE = /^(.*\S)\s+\((\d{4})\)(?:,\s*(.+))?$/;

export const CURSOR_SLATE_MARGIN = 12;

export const CURSOR_SNAP_MAX = [560, 280] as const;

export const CURSOR_ROW_MAX = [960, 120] as const;

export const CURSOR_FRAME_AWAY = 0.7;

export const CURSOR_RELEASED = "data-reticle-off";

export const CURSOR_MAGNET = 0.08;

export const CURSOR_MAGNET_MAX = 6;

export const CURSOR_LEAVE_GRACE = 90;

export const CURSOR_STEP = 1 / 240;

export const CURSOR_MOST = 1 / 20;

export const CURSOR_TURN = 9;

export const CURSOR_STILL = 0.01;

export const CURSOR_IDLE: CursorReading = {
  label: "",
  mode: "idle",
  target: null,
};

export const ENGINE_PHASES: readonly Phase[] = ["read", "update", "render"];

export const ENGINE_MAX_DELTA = 1 / 20;

export const ENGINE_FIRST_DELTA = 1 / 60;

export const ENGINE_REDUCED = "(prefers-reduced-motion: reduce)";

export const ENGINE_REST: Pointer = { x: 0, y: 0, active: false };

export const EXPOSE_EDGE = 24;

export const EXPOSE_BAND = 34;

export const EXPOSE_GLINT = 0.55;

export const EXPOSE_LIGHT = "rgb(255 253 247)";

export const EXPOSE_GLINT_RUNG = 1;

export const KIT_RECOUNT_RUNG = 1;

export const KIT_LAMP = [0, 0.3] as const;

export const KIT_NAME = [0.1, 0.65] as const;

export const KIT_RULE = [0.3, 0.85] as const;

export const KIT_ACTIONS = [0.5, 1] as const;

export const KIT_WIPE = [0.25, 0.85] as const;

export const KIT_WIPE_EDGE = 32;

export const KIT_ROOM = "0.5rem";

export const KIT_LETTER_SHARE = 0.45;

export const KIT_ACTION_SHARE = 0.5;

export const KIT_TAKES_A_HAND =
  'button, a[href], [role="tab"], [role="combobox"], [role="switch"]';

export const KIT_WASH = [
  "radial-gradient(70% 55% at 22% 38%, color-mix(in oklch, var(--tint, transparent) var(--wash-tint-a), transparent), transparent 70%)",
  "radial-gradient(60% 50% at 88% 92%, color-mix(in oklch, var(--tint, transparent) var(--wash-tint-b), transparent), transparent 70%)",
  "radial-gradient(65% 50% at 15% 0%, color-mix(in oklab, var(--ambient-top, transparent) var(--wash-top), transparent), transparent 72%)",
  "radial-gradient(60% 55% at 100% 20%, color-mix(in oklab, var(--ambient-right, transparent) var(--wash-right), transparent), transparent 72%)",
  "radial-gradient(70% 50% at 0% 100%, color-mix(in oklab, var(--ambient-left, transparent) var(--wash-left), transparent), transparent 72%)",
  "radial-gradient(60% 45% at 85% 100%, color-mix(in oklab, var(--ambient-bottom, transparent) var(--wash-bottom), transparent), transparent 72%)",
].join(", ");

export const KIT_SHEEN =
  "radial-gradient(60% 45% at 16% 0%, rgb(255 255 255 / var(--sheen-a)), transparent 70%)";

export const KIT_GLASS = [
  "radial-gradient(ellipse 125% 105% at 50% 45%, transparent 60%, rgb(var(--vignette-rgb) / var(--vignette-a)))",
  "linear-gradient(to right, rgb(var(--vignette-rgb) / var(--vignette-edge)), transparent 6%, transparent 94%, rgb(var(--vignette-rgb) / var(--vignette-edge)))",
  "linear-gradient(to bottom, rgb(var(--vignette-rgb) / var(--vignette-edge)), transparent 8%, transparent 92%, rgb(var(--vignette-rgb) / var(--vignette-edge)))",
].join(", ");

export const PHI = (1 + Math.sqrt(5)) / 2;

export const KIT_HOUSE_LEVEL = 1 / PHI;

export const KIT_HOUSE_RUNG = 1;

export const KIT_GRAIN_TILE = "/grain.png";

export const KIT_TILE = 512;

export const KIT_SETTLE_RUNG = 1;

export const MARQUEE_DEVELOP_RUNG = 2;

export const MARQUEE_REST_RUNG = 1;

export const MARQUEE_DIVE = [0.04, 0.6] as const;

export const MARQUEE_EDGES = [0, 0.4] as const;

export const MARQUEE_SPREAD = [0.02, 0.58] as const;

export const MARQUEE_FADE = [0.3, 0.66] as const;

export const MARQUEE_GLARE = [0.18, 0.62] as const;

export const MARQUEE_DIVE_REACH = 2.6;

export const MARQUEE_DIVE_MIN = 10;

export const MARQUEE_DIVE_MAX = 40;

export const MARQUEE_DRIFT = 0.035;

export const MARQUEE_TRACK_REST = 0.03;

export const MARQUEE_TRACK_FOCUS = 0.07;

export const MARQUEE_TRACK_OPEN = 0.46;

export const MARQUEE_SLIP = 12;

export const MARQUEE_MEASURE = 0.78;

export const MARQUEE_MEASURE_NARROW = 0.9;

export const MARQUEE_NARROW = 640;

export const MARQUEE_HEIGHT = 0.46;

export const MARQUEE_SIZE = 0.36;

export const MARQUEE_LEADING = 0.94;

export const MARQUEE_LINES = 3;

export const MARQUEE_REFERENCE = 100;

export const MARQUEE_MARGIN = 0.06;

export const MARQUEE_DENSITY = 2;

export const MARQUEE_RIM = "--ambient-vibrant-90";

export const MARQUEE_WASH = "--ambient-dominant-70";

export const MARQUEE_RIM_LEVEL = 0.55;

export const MARQUEE_WASH_LEVEL = 0.18;

export const MARQUEE_GLOW = `radial-gradient(58% 46% at 50% 48%, color-mix(in oklch, var(--ambient-vibrant-70, white) 24%, transparent), transparent 72%)`;

export const MARQUEE_LIGHT_EVERY = 250;

const MARQUEE_LAYER = Z_INDEX.DOCK_BACKDROP - 20;

export const MARQUEE_OUTPUT: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: MARQUEE_LAYER,
  userSelect: "none",
  WebkitUserSelect: "none",
};

export const PROJECTION_STREAK_GAIN = 2.5;

export const PROJECTION_AWAY_SOFT = 0.32;

export const PROJECTION_LEVEL_WIDTHS = [960, 320, 110] as const;

export const PROJECTION_HALO_WIDTH = 320;

export const PROJECTION_HALO_FROM = 0.62;

export const PROJECTION_BLUR_ROUNDS = 2;

export const PROJECTION_UNIFORMS = [
  "uImage",
  "uLevel1",
  "uLevel2",
  "uLevel3",
  "uHalo",
  "uImageB",
  "uLevelB1",
  "uLevelB2",
  "uLevelB3",
  "uHaloB",
  "uStreak",
  "uCanvas",
  "uImageSize",
  "uImageSizeB",
  "uCut",
  "uFocus",
  "uWeave",
  "uParallax",
  "uPool",
  "uPoolTrail",
  "uMotion",
  "uRack",
  "uDefocus",
  "uVelocity",
  "uHalation",
  "uFlicker",
  "uGrain",
  "uDust",
  "uScratch",
] as const;

export const PROJECTION_GRAIN = 0.18;

export const PROJECTION_FRAME_MS = 1000 / 24;

export const PROJECTION_CAMERA = { damping: 8.6, stiffness: 48 };

export const PROJECTION_LENS = { damping: 20.4, stiffness: 104 };

export const PROJECTION_LINGER = 4000;

export const PROJECTION_EXPOSURE = 0.58;

export const PROJECTION_EXPOSURE_MAX = 1.6;

export const PROJECTION_LENS_EXPOSURE = 0.12;

export const PROJECTION_TRAIL_MAX = 0.32;

export const PROJECTION_MAX_TEXTURE = 2560;

export const PROJECTION_DEVICE_CAP = 1.5;

export const PROJECTION_FAST = 4200;

export const PROJECTION_SETTLING_MS = 9000;

export const PROJECTION_KEYWORDS: Record<string, number> = {
  bottom: 1,
  center: 0.5,
  left: 0,
  right: 1,
  top: 0,
};

export const PROJECTION_UNPROJECTED: Projector = {
  show: () => {},
  stop: () => {},
};

export const UNSTAGED =
  "[data-part],[data-print]{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;visibility:visible!important;-webkit-mask-image:none!important;mask-image:none!important}";

export const SECTION_MARGIN = "0px 0px -38.2% 0px";

export const STAGE_MASK: CSSProperties = {
  display: "inline-block",
  overflow: "clip",
  verticalAlign: "top",
  paddingBottom: "0.08em",
  marginBottom: "-0.08em",
};

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const TEXT_WORD_ATTRIBUTE = "data-word";

export const CUE_LEAD = 3;

export const TRAIL_DROP = 1;

export const STAIRS_DROP = 4;

export const EVEN_DROP = 5;

export const SCREEN_ON = { line: 0.3, run: 0.95 };

export const SCREEN_OFF = { collapse: 0.18, point: 0.26, glow: 0.9 };

export const SCREEN_LINE = 0.004;

export const SCREEN_BEAM = "rgb(255 250 242)";

export const SCREEN_WAKE = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

export const SCREEN_THROUGH = 1.06;

export const SCREEN_DIM: Bezier = [0.3, 0, 0.2, 1];

export const SCREEN_UNTINTED = "data-untinted";

export const SCROLL_RUNG = 1;

export const SCROLL_LINE = 40;

export const SCROLL_LATCH = 160;

export const SCROLL_STYLE_TTL = 1000;

export const SCROLL_LOCK_TTL = 100;

export const SCROLLING = "data-scrolling";

export const HURRY_CAP = 2;

export const QUIET_RUNG = -1;

export const CARRY_DROP = 1;

export const CARRY_CAP = 2;

export const SCOPE_SEPARATOR = "/";

export const TILT_LEAN = 9;

export const BEAT = 0.5;

export const TRAVEL = 24;

export const TEMPO_RANGE = 3;

export const EPSILON = 1e-6;

export const POINTS = {
  linear: [0, 0, 1, 1],
  fade: [0.45, 0, 0.15, 1],
  silk: [0.5, 0.05, 0.1, 1],
  pour: [0.45, 0.08, 0.08, 1],
  expo: [0.36, 0.08, 0.08, 1],
  glide: [0.65, 0, 0.35, 1],
  dolly: [0.5, 0, 0.12, 1],
  fall: [0.45, 0, 0.55, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const QUIET = {
  enter: (p) => ({ opacity: p }),
  leave: (p) => ({ opacity: 1 - p }),
} satisfies Record<string, Verb>;

export const MATTER = {
  light: {
    rung: 2,
    mass: PHI ** -2,
    damping: 1,
    curve: "fade",
    enter: "glow",
    leave: "fade",
  },
  ink: {
    rung: 3,
    mass: PHI ** -1,
    damping: 0.9,
    curve: "silk",
    enter: "rise",
    leave: "fade",
  },
  paper: {
    rung: 3,
    mass: 1,
    damping: 0.86,
    curve: "pour",
    enter: "lift",
    leave: "sink",
  },
  glass: {
    rung: 2,
    mass: PHI ** -1,
    damping: 1,
    curve: "expo",
    enter: "clear",
    leave: "fog",
  },
  plate: {
    rung: 4,
    mass: PHI ** 2,
    damping: 1,
    curve: "pour",
    enter: "develop",
    leave: "cool",
  },
  metal: {
    rung: 4,
    mass: PHI ** 3,
    damping: 0.72,
    curve: "expo",
    enter: "settle",
    leave: "sink",
  },
} as const satisfies Record<string, Matter>;

export const LEAVE_DROP = 2;

export const LEAVE_CAP = 2;

export const RESPONSE_DROP = 3;

export const SHARP = { opacity: 1, filter: "none" } as const;

export const FILM_PAGE = /^\/(?:movie|person)\/[^/]+$/;

export const WALL_RETURN_MARGIN = 24;

export const WALL_SWEEP = [0, 0.62] as const;

export const WALL_FOCUS = [0.1, 1] as const;

export const WALL_EDGE = 30;

export const WALL_BAND = 46;

export const WALL_SOFT_RUNG = 5;

export const WALL_GLOW_RUNG = 2;

export const WALL_ROOM = "0.6em";

export const WALL_LIGHT = "rgb(255 253 247)";

export const WALL_GLOW =
  "0 0 0.3em rgb(150 190 255 / 0.8), 0 0 0.9em rgb(110 160 255 / 0.5)";
