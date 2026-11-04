import type { CSSProperties } from "react";
import { Z_INDEX, gpuTransform } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { dockTheme } from "@omerdlw/base-framework/modules/dock";
import { BACKDROP, FILL, FLOAT, GLASS, PRIMARY, SHELL, TIP } from "./chrome";
import { RADIUS } from "@/ui/page";
import type {
  DockMotion,
  DockSurfacePhaseMotion,
} from "@omerdlw/base-framework/modules/dock";
import { SHARP, hazy, motion, tween } from "./motion";

const { durations: time, easings: ease, springs } = motion;

const DARK = { opacity: 0 } as const;
const LIT = { opacity: 1 } as const;

const leave = tween(time.leave, ease.fade);
const touchLeave = tween(time.touch, ease.fade);
const move = tween(time.move, ease.pour);

const lightSet = (
  enter: ReturnType<typeof tween>,
  exit: ReturnType<typeof tween> = leave,
) => ({
  hidden: DARK,
  visible: { ...LIT, transition: enter },
  exit: { ...DARK, transition: exit },
});

// Content (text, icons) that changes inside the dock comes out of the soft
// and leaves into it; the glass itself never carries a filter.
const softSet = (
  enter: ReturnType<typeof tween>,
  exit: ReturnType<typeof tween> = leave,
) => ({
  hidden: hazy(2),
  visible: { ...SHARP, transition: enter },
  exit: { ...hazy(2), transition: exit },
});

const resizeFor = (distancePx: number) => {
  const run = time.reveal * Math.sqrt(Math.max(distancePx, 0) / 240);
  return tween(Math.min(time.move, Math.max(time.light, run)), ease.pour);
};

const atRest = (y: unknown) => gpuTransform(Number(y) || 0);

const surfaceResize = (distancePx: number) => {
  const resize = resizeFor(distancePx);
  return { ...resize, height: resize, width: resize };
};

// The body comes in a beat after the action leaves, and steps between its own
// views at the same pace.
const surfaceEnter = tween(time.reveal, ease.fade, time.touch);
const surfaceStep = tween(time.reveal, ease.fade);
const headerSwap = tween(time.light, ease.fade, time.step);

// A phase that plays nothing of its own: the deck rests, the header swaps and
// the body steps. The phases below change only what they play differently.
// The glass never compresses (scale 1), so a phase leaves the deck's size alone.
const REST_PHASE: DockSurfacePhaseMotion = {
  deck: null,
  transform: null,
  scale: 1,
  body: surfaceStep,
  header: headerSwap,
  headerReturn: null,
};

const controlSlot = {
  hidden: { opacity: 0, width: 0, marginRight: -2 },
  visible: {
    opacity: 1,
    width: "auto",
    marginRight: 0,
    transition: {
      width: tween(time.reveal, ease.pour),
      marginRight: tween(time.reveal, ease.pour),
      opacity: tween(time.light, ease.fade, time.touch),
    },
  },
  exit: {
    opacity: 0,
    width: 0,
    marginRight: -2,
    transition: {
      opacity: touchLeave,
      width: tween(time.light, ease.glide, time.touch),
      marginRight: tween(time.light, ease.glide, time.touch),
    },
  },
};

export const dockMotion: DockMotion = {
  transitions: {
    stack: move,
    expand: move,
    surfaceExit: tween(time.leave, ease.fade),
    // Motion's own default for a layout move; swap in `move` to keep it on the ladder.
    layout: tween(0.45, [0.4, 0, 0.1, 1]),
    card: move,
    cardExpanded: move,
    cardPeek: tween(time.light, ease.pour),
    fade: tween(time.reveal, ease.fade),
    text: tween(time.light, ease.fade),
    headerSwap,
    actionDismiss: touchLeave,
    icon: tween(time.light, ease.fade),
    badge: tween(time.light, ease.pour),
    hud: tween(time.reveal, ease.fade),
    press: springs.press,
    scrubberTooltip: tween(time.leave, ease.fade),
    scrubberFollow: springs.follow,
    mediaVolume: tween(time.touch, ease.pour),
  },
  variants: {
    fade: lightSet(tween(time.light, ease.fade, time.step)),
    textCrossfade: softSet(tween(time.reveal, ease.silk)),
    description: (opacity = 0.7) => ({
      hidden: hazy(2),
      visible: {
        opacity,
        filter: "none",
        transition: tween(time.reveal, ease.silk, time.step),
      },
      exit: { ...hazy(2), transition: leave },
    }),
    headerSwap: {
      hidden: DARK,
      visible: LIT,
      exit: { ...DARK, transition: leave },
    },
    headerRestore: lightSet(tween(time.reveal, ease.fade)),
    extensionShelf: lightSet(tween(time.leave, ease.fade)),
    actionDismiss: {
      hidden: DARK,
      visible: LIT,
      exit: { ...DARK, transition: touchLeave },
    },
    commandBar: {
      hidden: DARK,
      visible: (index: unknown = 0) => ({
        ...LIT,
        transition: tween(
          time.light,
          ease.fade,
          Math.min(Number(index) || 0, 4) * time.step,
        ),
      }),
      exit: { ...DARK, transition: touchLeave },
    },
    icon: softSet(tween(time.reveal, ease.silk)),
    badge: {
      hidden: { opacity: 0, transform: gpuTransform(0, 0.6) },
      visible: {
        opacity: 1,
        transform: gpuTransform(0, 1),
        transition: {
          transform: tween(time.light, ease.pour),
          opacity: tween(time.leave, ease.fade),
        },
      },
      exit: { opacity: 0, transform: gpuTransform(0, 0.8), transition: leave },
    },
    hud: lightSet(tween(time.reveal, ease.fade)),
    scrubberTooltip: lightSet(tween(time.leave, ease.fade), touchLeave),
    breadcrumbs: lightSet(tween(time.reveal, ease.fade, time.leave)),
    backdrop: {
      hidden: DARK,
      visible: { ...LIT, transition: tween(time.move, ease.fade) },
      exit: { ...DARK, transition: tween(time.reveal, ease.fade) },
    },
    surfaceBody: { hidden: DARK, visible: LIT, exit: DARK },
    controlsContainer: {
      hidden: (y: unknown = 0) => ({ opacity: 0, transform: atRest(y) }),
      visible: (y: unknown = 0) => ({
        opacity: 1,
        transform: atRest(y),
        transition: {
          opacity: tween(time.light, ease.fade, time.touch),
          transform: move,
        },
      }),
      exit: (y: unknown = 0) => ({
        opacity: 0,
        transform: atRest(y),
        transition: { opacity: touchLeave, transform: move },
      }),
    },
    controlsAction: controlSlot,
    controlsBack: controlSlot,
    controlsClose: lightSet(tween(time.light, ease.fade), touchLeave),
    press: {
      idle: { scale: 1 },
      hover: { scale: 1 },
      tap: { scale: 1 },
    },
    mediaVolumeThumb: { idle: { scale: 1 }, dragging: { scale: 1.15 } },
    cardContent: { hidden: hazy(3), visible: SHARP },
  },
  phases: {
    idle: REST_PHASE,
    dismissAction: { ...REST_PHASE, transform: leave, header: leave },
    expandBody: {
      ...REST_PHASE,
      deck: move,
      transform: move,
      body: surfaceEnter,
    },
    open: { ...REST_PHASE, deck: surfaceResize },
    anticipation: { ...REST_PHASE, deck: surfaceResize, transform: leave },
    collapseBody: { ...REST_PHASE, deck: move, headerReturn: surfaceEnter },
    restoreHeader: { ...REST_PHASE, deck: move },
  },
  deck: {
    elevation: {
      rest: "none",
      elevated: "none",
    },
    peek: (position) => {
      const progress = Math.min(position / 3, 1);
      return {
        lift: position * (4 * (0.85 + progress * 0.35)),
        scale: 1 + 0.008 * (1 - progress * 0.25),
      };
    },
    exit: ({ y, scale }) => ({
      opacity: 0,
      transform: gpuTransform(y, scale ?? 1),
      transition: tween(time.reveal, ease.fade),
    }),
    tapScale: 0.98,
    stacking: {
      collapsed: {
        offsetY: -10,
        scale: 0.88,
        opacityStep: 0.2,
        opacityMin: 0.1,
      },
      expanded: { offsetY: -72 },
      shelf: { offsetY: -42, scale: 0.94 },
      visible: { stack: 3, extensions: 2, status: 1 },
    },
    breadcrumbOffset: -44,
    fullscreenOpacity: 0,
    origin: "50% 100%",
    resizeFallback: 260,
  },
  opacity: { banner: 0.95, description: 0.7 },
  drag: {
    elastic: { top: 0.05, bottom: 0.5 },
    range: [0, 180],
    opacity: [1, 0.75],
    scale: [1, 0.96],
    dismiss: { offset: 65, velocity: 400 },
  },
  skeleton: "",
  timings: {
    dismissAction: time.touch,
    anticipation: time.touch,
    expandBody: time.move,
    collapseBody: time.move,
    restoreHeader: 0,
    expandStagger: time.step,
    expandStaggerCap: time.leave,
    peekStagger: time.step / 2,
    peekStaggerCap: time.touch,
  },
};

const toLeft = (gradient: string) =>
  gradient
    .replaceAll("to right", "to left")
    .replace(/at (\d+)%/g, (_, x) => `at ${100 - Number(x)}%`);

const BANNER_SHARP_MASK =
  "radial-gradient(ellipse 72% 170% at 82% 42%, black 0%, black 32%, rgba(0,0,0,0.7) 52%, rgba(0,0,0,0.25) 74%, transparent 100%), linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, black 28%, black 72%, rgba(0,0,0,0.7) 100%), linear-gradient(to right, black 0%, black 68%, rgba(0,0,0,0.55) 100%)";

const BANNER_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 45%), linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 28%, rgba(0,0,0,0.1) 52%, transparent 66%, rgba(0,0,0,0.12) 76%, rgba(0,0,0,0.38) 100%)";

const INNER = "rounded-card";

const CONTROL_BUTTON = `ui-iris center relative size-9 shrink-0 cursor-pointer text-ink-body hover:text-ink focus-visible:text-ink ${FLOAT}`;

const MEDIA_ICON_BUTTON = `ui-iris center relative size-8 cursor-pointer rounded-full text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`;

const TONE_MUTED = `text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`;
const TIP_SHAPE = "rounded-full px-3 py-1.5 type-meta font-medium";

export const dockThemeConfig = defineTheme(dockTheme, {
  slots: {
    stack:
      "dock-root ui-motion @container fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none",
    backdrop: `fixed inset-0 cursor-pointer ${BACKDROP}`,

    card: [
      `group @container absolute h-auto w-full overflow-hidden rounded-shell p-2.5 backdrop-blur-md cursor-pointer ${SHELL}`,
      "data-[anchored=true]:cursor-default data-[blur=heavy]:backdrop-blur-lg data-[shelf=true]:px-[6.5px] data-[shelf=true]:py-0",
      "data-[placement=top]:inset-0 data-[placement=top]:h-full data-[placement=bottom]:bottom-0 data-[placement=float]:top-0",
      "data-[ghost=true]:pointer-events-none data-[ghost=true]:select-none",
    ].join(" "),
    cardContent:
      "flow-root w-full overflow-hidden data-[shelf=true]:min-h-[96px]",
    cardSurface: `w-full overflow-hidden ${INNER}`,
    cardShelf: "relative flex h-[45px] w-full items-center justify-between",
    cardStandard: "w-full",
    cardHud: "relative flex w-full items-center justify-between",
    cardBody: "relative flex h-auto w-full flex-col gap-2.5",
    cardFooter: "relative w-full overflow-visible",
    cardAction: "flow-root overflow-visible",

    bannerRoot:
      "pointer-events-none absolute inset-0 overflow-hidden select-none",
    bannerSharpImage: "absolute inset-0",
    bannerScrim: "pointer-events-none absolute inset-0",

    header: "relative min-h-[48px] w-full",
    headerRow: "relative flex w-full items-center gap-2.5",
    headerIcon: "center relative shrink-0",
    headerIconEmpty: "size-12",
    headerBody:
      "relative flex w-full flex-1 items-center justify-between gap-2.5 overflow-hidden",
    headerText:
      "flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5",
    headerTitleRow: "flex items-center gap-1.5",
    headerTitle: "type-copy",
    title: "truncate font-semibold",
    titleWrap: "relative overflow-hidden",
    description: "relative min-h-[1.25rem] w-full overflow-hidden type-body",
    descriptionText:
      "text-ink-body data-[multiline=false]:truncate data-[multiline=true]:wrap-break-word data-[multiline=true]:whitespace-normal",

    icon: "relative size-12 shrink-0",
    iconMotion: "size-full",
    iconImage: `size-12 shrink-0 ${INNER} bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-edge`,
    iconGlyph: `center size-12 shrink-0 ${INNER} text-ink ${FILL}`,
    iconGlyphInner: "center shrink-0",
    iconButton: "size-full cursor-pointer p-0 focus:outline-none select-none",
    iconBadge:
      "center absolute -end-1 -bottom-1 size-6 overflow-hidden rounded-full bg-black type-label leading-none font-bold tabular-nums text-ink",
    iconOverlay:
      "center absolute -end-1.5 -bottom-1.5 size-6 overflow-hidden rounded-full data-[interactive=false]:cursor-default data-[interactive=true]:cursor-pointer",
    iconOverlayImage:
      "size-full rounded-full bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-edge-hover",
    iconOverlayGlyph: "center text-ink",

    commandBar: "flex shrink-0 items-center",
    commandTooltip: `dock-tooltip ${TIP_SHAPE} ${TIP}`,
    command:
      "ui-iris center relative size-9 cursor-pointer rounded-full bg-transparent text-ink-body hover:text-ink focus-visible:text-ink select-none data-[banner=true]:[--iris:var(--color-fill-hover)] data-[banner=true]:before:backdrop-blur-md",
    commandBadge:
      "center bg-grade absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 rounded-full type-micro leading-none font-semibold tabular-nums text-black",

    statusCard: GLASS,
    statusIcon: "bg-fill text-ink",
    statusTitle: "text-ink",
    statusDescription: "text-ink-body",

    surfaceHost: `@container relative w-full overflow-hidden ${INNER}`,
    surfaceHostInner: "w-full",
    surfaceShell: `@container relative flex flex-col overflow-hidden ${INNER}`,
    surfaceBody: `tempo-quick @container w-full overflow-hidden ${INNER}`,

    controls:
      "pointer-events-none absolute inset-x-0 bottom-[calc(100%+12px)] select-none flex items-center justify-center gap-1",
    controlAction:
      "pointer-events-auto flex shrink-0 items-center overflow-hidden",
    controlBack: "pointer-events-auto shrink-0 overflow-hidden",
    controlClose: "pointer-events-auto shrink-0",
    controlButton: CONTROL_BUTTON,
    controlBackIcon: "rtl:rotate-180",
    controlHeaderButton: `pointer-events-auto ${CONTROL_BUTTON} disabled:opacity-50 disabled:pointer-events-none data-[text=true]:h-9 data-[text=true]:px-4 data-[text=true]:type-control data-[text=true]:font-medium data-[text=true]:whitespace-nowrap`,
    controlRadiusSingle: "rounded-full",
    controlRadiusFirst: "rounded-full",
    controlRadiusLast: "rounded-full",
    controlRadiusMiddle: "rounded-full",

    extensions:
      "relative flex h-full w-full items-center justify-between select-none",
    extensionsLeft:
      "pointer-events-auto flex h-full shrink-0 items-center justify-start gap-1 data-[fill=true]:w-full data-[fill=true]:min-w-0 data-[fill=true]:flex-1",
    extensionsCenterLayer:
      "pointer-events-none absolute inset-0 flex items-center justify-center",
    extensionsCenter:
      "pointer-events-auto flex items-center justify-center gap-1 data-[fill=true]:w-full",
    extensionsRight:
      "pointer-events-auto ms-auto flex h-full shrink-0 items-center justify-end gap-1",
    extensionPill:
      "pointer-events-auto flex min-h-6 h-full max-w-full items-center gap-1 select-none data-[fill=true]:w-full data-[fill=true]:min-w-0 data-[fill=true]:flex-1 data-[fill=true]:justify-center",
    extensionBare:
      "pointer-events-auto data-[fill=true]:w-full data-[fill=true]:min-w-0 data-[fill=true]:flex-1",

    scrubber:
      "group absolute inset-x-0 top-0 h-3 cursor-pointer touch-none overflow-hidden rounded-t-shell select-none",
    scrubberTrack:
      "absolute inset-x-0 top-0 h-1 w-full origin-top scale-y-[0.625] transform-gpu bg-line",
    scrubberProgress:
      "h-full w-full origin-left bg-ink-body group-hover:bg-ink group-focus-visible:bg-ink group-has-focus-visible:bg-ink",
    scrubberTooltip: `pointer-events-none absolute top-3 -translate-x-1/2 tabular-nums ${TIP_SHAPE} ${TIP}`,

    media: "flex w-full items-center justify-between gap-2 select-none",
    mediaGroup: "flex items-center gap-1.5",
    mediaSpeed: `center h-8 cursor-pointer rounded-full px-3.5 type-meta font-medium tabular-nums text-ink-body select-none hover:text-ink focus-visible:text-ink data-[active=true]:bg-grade/15 data-[active=true]:text-grade data-[active=true]:ring-grade/25 data-[active=true]:hover:bg-grade/20 data-[active=true]:focus-visible:bg-grade/20 data-[active=true]:hover:text-grade data-[active=true]:hover:ring-grade/30 data-[active=true]:focus-visible:ring-grade/30 ${FILL}`,
    mediaSkip: MEDIA_ICON_BUTTON,
    mediaToggle: `flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-body select-none hover:text-ink focus-visible:text-ink data-[active=true]:bg-grade/15 data-[active=true]:text-grade data-[active=true]:ring-grade/25 data-[active=true]:hover:bg-grade/20 data-[active=true]:focus-visible:bg-grade/20 data-[active=true]:hover:text-grade data-[active=true]:hover:ring-grade/30 data-[active=true]:focus-visible:ring-grade/30 ${FILL}`,
    mediaMute:
      "center size-5 cursor-pointer p-0 text-ink-body hover:text-ink focus-visible:text-ink",
    mediaVolume: `group flex h-8 items-center gap-1.5 rounded-full px-3 select-none data-[active=true]:bg-fill-hover ${FILL}`,
    mediaVolumeTrack:
      "group/track relative flex h-6 w-16 cursor-pointer touch-none items-center select-none sm:w-20",
    mediaVolumeRail:
      "relative h-1.5 w-full overflow-hidden rounded-full bg-line",
    mediaVolumeFill: "h-full origin-left rounded-full bg-ink-body",
    mediaVolumeThumb:
      "ui-fade pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 group-hover/track:opacity-100 group-focus-visible/track:opacity-100 group-has-focus-visible/track:opacity-100 data-[active=true]:opacity-100",

    breadcrumbs: `absolute inset-x-0 top-[calc(100%+6px)] flex h-10 w-full items-center justify-center rounded-full px-5 type-meta select-none ${FLOAT}`,
    breadcrumbsNav: "flex scrollbar-none items-center gap-1.5 overflow-x-auto",
    breadcrumbsEllipsis: "px-0.5 text-ink-muted select-none",
    breadcrumbsItem: "flex items-center gap-1.5",
    breadcrumbsCurrent: "max-w-[180px] truncate font-medium text-ink",
    breadcrumbsLink:
      "max-w-[140px] truncate text-ink-body hover:text-ink focus-visible:text-ink",
    breadcrumbsSeparator: "center shrink-0 text-ink-muted rtl:rotate-180",

    loading: "flex min-h-[48px] w-full items-center gap-2.5",
    loadingIcon: `skeleton-block size-12 shrink-0 ${INNER}`,
    loadingText: "flex min-w-0 flex-1 flex-col justify-center gap-1.5",
    loadingTitle: "skeleton-block h-3.5 w-36 max-w-[60%] rounded-full",
    loadingDescription: "skeleton-block h-3 w-56 max-w-[85%] rounded-full",

    action: `ui-sheen center h-10 w-full ${INNER} gap-2 px-4 type-control font-medium cursor-pointer select-none`,
    actionActive: PRIMARY,
    actionFill: "min-w-0 flex-1 justify-center whitespace-nowrap",
    actionLabel: "truncate",
    actionMuted: TONE_MUTED,
    actionRow: "flex w-full items-center gap-2.5",
    actionStack: "flex flex-col gap-2.5",
    actionSurface: GLASS,
  },
  styles: {
    stack: {
      zIndex: Z_INDEX.DOCK,
      maxWidth: "100vw",
      contain: "layout",
      borderRadius: RADIUS.shell,
    },
    backdrop: { zIndex: Z_INDEX.DOCK_BACKDROP },
    cardFooter: { zIndex: Z_INDEX.DOCK_CARD_CONTENT },
    bannerRoot: { zIndex: Z_INDEX.DOCK_CARD_BACKGROUND },
    bannerSharpImage: {
      "--dock-banner-mask-ltr": BANNER_SHARP_MASK,
      "--dock-banner-mask-rtl": toLeft(BANNER_SHARP_MASK),
    } as CSSProperties,
    bannerScrim: {
      "--dock-banner-scrim-ltr": BANNER_SCRIM,
      "--dock-banner-scrim-rtl": toLeft(BANNER_SCRIM),
    } as CSSProperties,
    iconBadge: { zIndex: Z_INDEX.DOCK_CARD_BADGE },
    iconOverlay: { zIndex: Z_INDEX.DOCK_CARD_BADGE },
    scrubber: { zIndex: Z_INDEX.DOCK_CARD_MEDIA },
    controls: { zIndex: Z_INDEX.DOCK_SURFACE_POPOVER },
    controlButton: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    controlHeaderButton: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    extensionsLeft: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    extensionsCenterLayer: { zIndex: Z_INDEX.DOCK_SURFACE_CENTER },
    extensionsRight: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    breadcrumbs: { zIndex: Z_INDEX.DOCK_BREADCRUMBS },
  },
  motion: dockMotion,
});
