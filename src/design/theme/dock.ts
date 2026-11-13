import {
  type DockMotion,
  type DockSurfacePhaseMotion,
  dockTheme,
} from "@omerdlw/base-framework/dock";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { gpuTransform } from "@omerdlw/base-framework/utils";
import { SKELETON } from "@/design/components/skeleton";
import { TOOLTIP } from "@/design/components/tooltip";
import { RADIUS } from "@/design/foundations/geometry";
import { BACKDROP, FLOAT, GLASS, TIP } from "@/design/foundations/layers";
import { FILL, PRIMARY } from "@/design/foundations/tones";
import { Z_INDEX } from "@/design/foundations/z-index";
import { hazy, motion, SHARP, tween } from "@/motion/time";

const { durations: dockTime, easings: dockEase, springs: dockSprings } = motion;

const DARK = { opacity: 0 } as const;
const LIT = { opacity: 1 } as const;

const dockLeave = tween(dockTime.leave, dockEase.fade);
const touchLeave = tween(dockTime.touch, dockEase.fade);
const move = tween(dockTime.move, dockEase.pour);

const lightSet = (
  enter: ReturnType<typeof tween>,
  exit: ReturnType<typeof tween> = dockLeave,
) => ({
  hidden: DARK,
  visible: { ...LIT, transition: enter },
  exit: { ...DARK, transition: exit },
});

const softSet = (
  enter: ReturnType<typeof tween>,
  exit: ReturnType<typeof tween> = dockLeave,
) => ({
  hidden: hazy(2),
  visible: { ...SHARP, transition: enter },
  exit: { ...hazy(2), transition: exit },
});

const resizeFor = (distancePx: number) => {
  const run = dockTime.reveal * Math.sqrt(Math.max(distancePx, 0) / 240);
  return tween(
    Math.min(dockTime.move, Math.max(dockTime.light, run)),
    dockEase.pour,
  );
};

const atRest = (y: unknown) => gpuTransform(Number(y) || 0);

const surfaceResize = (distancePx: number) => {
  const resize = resizeFor(distancePx);
  return { ...resize, height: resize, width: resize };
};

const surfaceEnter = tween(dockTime.reveal, dockEase.fade, dockTime.touch);
const surfaceStep = tween(dockTime.reveal, dockEase.fade);
const headerSwap = tween(dockTime.light, dockEase.fade, dockTime.step);

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
      width: tween(dockTime.reveal, dockEase.pour),
      marginRight: tween(dockTime.reveal, dockEase.pour),
      opacity: tween(dockTime.light, dockEase.fade, dockTime.touch),
    },
  },
  exit: {
    opacity: 0,
    width: 0,
    marginRight: -2,
    transition: {
      opacity: touchLeave,
      width: tween(dockTime.light, dockEase.glide, dockTime.touch),
      marginRight: tween(dockTime.light, dockEase.glide, dockTime.touch),
    },
  },
};

const dockMotion: DockMotion = {
  transitions: {
    stack: move,
    expand: move,
    surfaceExit: tween(dockTime.leave, dockEase.fade),
    layout: tween(0.45, [0.4, 0, 0.1, 1]),
    card: move,
    cardExpanded: move,
    cardPeek: tween(dockTime.light, dockEase.pour),
    fade: tween(dockTime.reveal, dockEase.fade),
    text: tween(dockTime.light, dockEase.fade),
    headerSwap,
    actionDismiss: touchLeave,
    icon: tween(dockTime.light, dockEase.fade),
    badge: tween(dockTime.light, dockEase.pour),
    hud: tween(dockTime.reveal, dockEase.fade),
    press: dockSprings.press,
    scrubberTooltip: tween(dockTime.leave, dockEase.fade),
    scrubberFollow: dockSprings.follow,
    mediaVolume: tween(dockTime.touch, dockEase.pour),
  },
  variants: {
    fade: lightSet(tween(dockTime.light, dockEase.fade, dockTime.step)),
    textCrossfade: softSet(tween(dockTime.reveal, dockEase.silk)),
    description: (opacity = 0.7) => ({
      hidden: hazy(2),
      visible: {
        opacity,
        filter: "none",
        transition: tween(dockTime.reveal, dockEase.silk, dockTime.step),
      },
      exit: { ...hazy(2), transition: dockLeave },
    }),
    headerSwap: {
      hidden: DARK,
      visible: LIT,
      exit: { ...DARK, transition: dockLeave },
    },
    headerRestore: lightSet(tween(dockTime.reveal, dockEase.fade)),
    extensionShelf: lightSet(tween(dockTime.leave, dockEase.fade)),
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
          dockTime.light,
          dockEase.fade,
          Math.min(Number(index) || 0, 4) * dockTime.step,
        ),
      }),
      exit: { ...DARK, transition: touchLeave },
    },
    icon: softSet(tween(dockTime.reveal, dockEase.silk)),
    badge: {
      hidden: { opacity: 0, transform: gpuTransform(0, 0.6) },
      visible: {
        opacity: 1,
        transform: gpuTransform(0, 1),
        transition: {
          transform: tween(dockTime.light, dockEase.pour),
          opacity: tween(dockTime.leave, dockEase.fade),
        },
      },
      exit: {
        opacity: 0,
        transform: gpuTransform(0, 0.8),
        transition: dockLeave,
      },
    },
    hud: lightSet(tween(dockTime.reveal, dockEase.fade)),
    scrubberTooltip: lightSet(tween(dockTime.leave, dockEase.fade), touchLeave),
    breadcrumbs: lightSet(
      tween(dockTime.reveal, dockEase.fade, dockTime.leave),
    ),
    backdrop: {
      hidden: DARK,
      visible: { ...LIT, transition: tween(dockTime.move, dockEase.fade) },
      exit: { ...DARK, transition: tween(dockTime.reveal, dockEase.fade) },
    },
    surfaceBody: { hidden: DARK, visible: LIT, exit: DARK },
    controlsContainer: {
      hidden: (y: unknown = 0) => ({ opacity: 0, transform: atRest(y) }),
      visible: (y: unknown = 0) => ({
        opacity: 1,
        transform: atRest(y),
        transition: {
          opacity: tween(dockTime.light, dockEase.fade, dockTime.touch),
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
    controlsClose: lightSet(tween(dockTime.light, dockEase.fade), touchLeave),
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
    dismissAction: { ...REST_PHASE, transform: dockLeave, header: dockLeave },
    expandBody: {
      ...REST_PHASE,
      deck: move,
      transform: move,
      body: surfaceEnter,
    },
    open: { ...REST_PHASE, deck: surfaceResize },
    anticipation: { ...REST_PHASE, deck: surfaceResize, transform: dockLeave },
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
      transition: tween(dockTime.reveal, dockEase.fade),
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
    dismissAction: dockTime.touch,
    anticipation: dockTime.touch,
    expandBody: dockTime.move,
    collapseBody: dockTime.move,
    restoreHeader: 0,
    expandStagger: dockTime.step,
    expandStaggerCap: dockTime.leave,
    peekStagger: dockTime.step / 2,
    peekStaggerCap: dockTime.touch,
    staggerExponent: 0.82,
  },
};

const INNER = "rounded-card";

const CONTROL_BUTTON = `ui-iris center relative size-control-chrome shrink-0 cursor-pointer text-ink-body hover:text-ink focus-visible:text-ink ${FLOAT}`;

const MEDIA_ICON_BUTTON = `ui-iris center relative size-control-sm cursor-pointer rounded-full text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`;

const TONE_MUTED = `text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`;
const TIP_SHAPE = "rounded-full px-3 py-1.5 type-meta font-medium";

export const dockThemeConfig = defineTheme(dockTheme, {
  slots: {
    stack:
      "dock-root ui-motion @container fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none",
    backdrop: `fixed inset-0 cursor-pointer ${BACKDROP}`,

    card: [
      `group @container absolute h-auto w-full overflow-hidden rounded-shell p-2.5 cursor-pointer bg-glass/70 ring-1 ring-edge-hover ring-inset data-[placement=top]:backdrop-blur-md data-[placement=top]:backdrop-saturate-150`,
      "data-[blur=heavy]:[#dock-card-stack[data-controls-hidden=true]_&]:backdrop-blur-md data-[blur=heavy]:[#dock-card-stack[data-controls-hidden=true]_&]:backdrop-saturate-150",
      "data-[anchored=true]:cursor-default data-[shelf=true]:px-[6.5px] data-[shelf=true]:py-0",
      "data-[placement=top]:inset-0 data-[placement=top]:h-full data-[placement=bottom]:bottom-0 data-[placement=float]:top-0 data-[placement=float]:[#dock-card-stack[data-controls-hidden=false]_&]:h-full",
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
    surfaceLoader:
      "flex min-h-[160px] w-full items-center justify-center p-8 [&_iconify-icon]:size-7 [&_iconify-icon]:text-[length:28px]",

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
      "center absolute -end-1 -bottom-1 size-6 overflow-hidden rounded-full bg-page type-label leading-none font-bold tabular-nums text-ink",
    iconOverlay:
      "center absolute -end-1.5 -bottom-1.5 size-6 overflow-hidden rounded-full data-[interactive=false]:cursor-default data-[interactive=true]:cursor-pointer",
    iconOverlayImage:
      "size-full rounded-full bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-edge-hover",
    iconOverlayGlyph: "center text-ink",

    commandBar: "flex shrink-0 items-center",
    commandTooltip: `${TOOLTIP.dock} ${TIP_SHAPE} ${TIP}`,
    command:
      "ui-iris center relative size-control-chrome cursor-pointer rounded-full bg-transparent text-ink-body hover:text-ink focus-visible:text-ink select-none data-[banner=true]:[--iris:var(--color-fill-hover)]",
    commandBadge:
      "center bg-grade absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 rounded-full type-micro leading-none font-semibold tabular-nums text-on-accent",

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
    controlHeaderButton: `pointer-events-auto ${CONTROL_BUTTON} disabled:opacity-50 disabled:pointer-events-none data-[text=true]:h-control-chrome data-[text=true]:px-4 data-[text=true]:type-control data-[text=true]:font-medium data-[text=true]:whitespace-nowrap`,
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
    mediaSpeed: `center h-control-sm cursor-pointer rounded-full px-3.5 type-meta font-medium tabular-nums text-ink-body select-none hover:text-ink focus-visible:text-ink data-[active=true]:bg-grade/15 data-[active=true]:text-grade data-[active=true]:ring-grade/25 data-[active=true]:hover:bg-grade/20 data-[active=true]:focus-visible:bg-grade/20 data-[active=true]:hover:text-grade data-[active=true]:hover:ring-grade/30 data-[active=true]:focus-visible:ring-grade/30 ${FILL}`,
    mediaSkip: MEDIA_ICON_BUTTON,
    mediaToggle: `flex size-control-sm cursor-pointer items-center justify-center rounded-full text-ink-body select-none hover:text-ink focus-visible:text-ink data-[active=true]:bg-grade/15 data-[active=true]:text-grade data-[active=true]:ring-grade/25 data-[active=true]:hover:bg-grade/20 data-[active=true]:focus-visible:bg-grade/20 data-[active=true]:hover:text-grade data-[active=true]:hover:ring-grade/30 data-[active=true]:focus-visible:ring-grade/30 ${FILL}`,
    mediaMute:
      "center size-5 cursor-pointer p-0 text-ink-body hover:text-ink focus-visible:text-ink",
    mediaVolume: `group flex h-control-sm items-center gap-1.5 rounded-full px-3 select-none data-[active=true]:bg-fill-hover ${FILL}`,
    mediaVolumeTrack:
      "group/track relative flex h-6 w-16 cursor-pointer touch-none items-center select-none sm:w-20",
    mediaVolumeRail:
      "relative h-1.5 w-full overflow-hidden rounded-full bg-line",
    mediaVolumeFill: "h-full origin-left rounded-full bg-ink-body",
    mediaVolumeThumb:
      "ui-fade pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 group-hover/track:opacity-100 group-focus-visible/track:opacity-100 group-has-focus-visible/track:opacity-100 data-[active=true]:opacity-100",

    breadcrumbs: `absolute inset-x-0 top-[calc(100%+6px)] flex h-control-md w-full items-center justify-center rounded-full px-5 type-meta select-none ${FLOAT}`,
    breadcrumbsNav: "flex scrollbar-none items-center gap-1.5 overflow-x-auto",
    breadcrumbsEllipsis: "px-0.5 text-ink-muted select-none",
    breadcrumbsItem: "flex items-center gap-1.5",
    breadcrumbsCurrent: "max-w-[180px] truncate font-medium text-ink",
    breadcrumbsLink:
      "max-w-[140px] truncate text-ink-body hover:text-ink focus-visible:text-ink",
    breadcrumbsSeparator: "center shrink-0 text-ink-muted rtl:rotate-180",

    loading: "flex min-h-[48px] w-full items-center gap-2.5",
    loadingIcon: `${SKELETON.block} size-12 shrink-0 ${INNER}`,
    loadingText: "flex min-w-0 flex-1 flex-col justify-center gap-1.5",
    loadingTitle: `${SKELETON.block} h-3.5 w-36 max-w-[60%] rounded-full`,
    loadingDescription: `${SKELETON.block} h-3 w-56 max-w-[85%] rounded-full`,

    action: `ui-sheen center h-control-md w-full ${INNER} gap-2 px-4 type-control font-medium cursor-pointer select-none`,
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
