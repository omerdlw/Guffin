import { errorTheme } from "@omerdlw/base-framework/error";
import { ambientTheme } from "@omerdlw/base-framework/modules/ambient";
import {
  type ContextMenuMotion,
  contextMenuTheme,
} from "@omerdlw/base-framework/modules/context-menu";
import { controlsTheme } from "@omerdlw/base-framework/modules/controls";
import {
  type DockMotion,
  type DockSurfacePhaseMotion,
  dockTheme,
} from "@omerdlw/base-framework/modules/dock";
import {
  type ModalMotion,
  type ModalPositionMotion,
  modalTheme,
} from "@omerdlw/base-framework/modules/modal";
import {
  type NotificationMotion,
  notificationTheme,
} from "@omerdlw/base-framework/modules/notification";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { gpuTransform, Z_INDEX } from "@omerdlw/base-framework/tokens";
import { SHARP } from "@/motion/constants";
import { motion } from "@/motion/time";
import { hazy, step, tween } from "@/motion/utils";
import { buttonVariants } from "@/design/components/button";
import { SKELETON } from "@/design/components/skeleton";
import { TOOLTIP } from "@/design/components/tooltip";
import { RADIUS } from "@/design/foundations/geometry";
import {
  BACKDROP,
  DIM,
  FLOAT,
  GLASS,
  SHELL,
  TIP,
} from "@/design/foundations/layers";
import { FILL, PRIMARY, TONE } from "@/design/foundations/tones";

const errorThemeConfig = defineTheme(errorTheme, {
  slots: {
    screen:
      "ui-motion w-screen h-screen flex flex-col gap-2.5 center bg-danger/10",
    icon: "bg-fill text-ink flex size-12 items-center justify-center rounded-full ring-1 ring-inset ring-edge-hover type-heading font-bold",
    title: "type-title font-semibold",
    retryButton: buttonVariants({
      className: "px-5",
      intent: "primary",
      shape: "pill",
    }),
  },
});

const ambientThemeConfig = defineTheme(ambientTheme, {
  slots: {
    transition: "",
  },
});

const { durations: time, easings: ease, springs } = motion;

const leave = tween(time.leave, ease.fade);
const ORIGIN = "top left";

const rowDelay = (index: unknown) =>
  time.step + Math.min(Math.max(Number(index) || 0, 0), 5) * time.step;

const contextMenuMotion: ContextMenuMotion = {
  pop: {
    hidden: {
      opacity: 0,
      transform: "translate3d(0px, 0px, 0) scale(0.96)",
      transformOrigin: ORIGIN,
    },
    visible: {
      opacity: 1,
      transform: "translate3d(0px, 0px, 0) scale(1)",
      transformOrigin: ORIGIN,
      transition: {
        transform: tween(step(1), ease.silk),
        opacity: tween(step(0), ease.fade),
      },
    },
    exit: {
      opacity: 0,
      transform: "translate3d(0px, 0px, 0) scale(0.98)",
      transformOrigin: ORIGIN,
      transition: leave,
    },
  },
  content: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: tween(time.reveal, ease.fade) },
  },
  item: {
    hidden: hazy(2),
    visible: (index: unknown = 0) => ({
      ...SHARP,
      transition: tween(step(0), ease.silk, rowDelay(index)),
    }),
  },
  itemTap: { transform: "translate3d(0px, 0px, 0) scale(1)" },
  itemTransition: springs.press,
};

const contextMenuThemeConfig = defineTheme(contextMenuTheme, {
  slots: {
    backdrop: "fixed inset-0",
    menu: `ui-motion max-w-sm min-w-64 overflow-hidden rounded-sheet ${SHELL}`,
    header: "mb-2 flex items-center gap-3 border-b border-rule pb-2",
    headerIcon:
      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-card ring-1 ring-inset ring-edge bg-fill bg-cover bg-center bg-no-repeat text-ink-body",
    headerText: "h-full w-full min-w-0 space-y-0.5",
    headerEyebrow: `${TONE.label} text-ink-muted`,
    headerTitle: "truncate type-body font-semibold text-ink",
    headerDescription: "type-meta text-ink-body",
    separator: "mx-3 my-1.5 h-px bg-rule",
    item: "group flex h-control-md w-full items-center gap-2.5 rounded-card px-3 text-left type-body font-medium text-ink-body hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink data-[active=true]:bg-fill-hover data-[active=true]:text-ink disabled:pointer-events-none disabled:opacity-50",
    itemIcon:
      "ui-glyph shrink-0 text-ink-muted group-hover:text-ink-body group-focus-visible:text-ink-body group-has-focus-visible:text-ink-body",
    itemLabel: "grow truncate",
    itemShortcut:
      "ml-2 shrink-0 rounded-full bg-fill px-2 py-0.5 type-label text-ink-muted uppercase ring-1 ring-edge ring-inset",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP },
    menu: { padding: 8, zIndex: Z_INDEX.CONTEXT_MENU },
  },
  motion: contextMenuMotion,
});

const controlsThemeConfig = defineTheme(controlsTheme, {
  slots: {
    rail: "pointer-events-none fixed hidden w-max max-w-[calc(100vw-8px)] lg:block",
    stack:
      "pointer-events-auto flex w-max max-w-full flex-col-reverse gap-y-1 data-[side=left]:items-end data-[side=right]:items-start",
  },
  styles: {
    rail: { zIndex: Z_INDEX.DOCK },
  },
});

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
  },
};

const INNER = "rounded-card";

const CONTROL_BUTTON = `ui-iris center relative size-control-chrome shrink-0 cursor-pointer text-ink-body hover:text-ink focus-visible:text-ink ${FLOAT}`;

const MEDIA_ICON_BUTTON = `ui-iris center relative size-control-sm cursor-pointer rounded-full text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`;

const TONE_MUTED = `text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`;
const TIP_SHAPE = "rounded-full px-3 py-1.5 type-meta font-medium";

const dockThemeConfig = defineTheme(dockTheme, {
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

const { durations: modalTime, easings: modalEase } = motion;

const REST = "translate3d(0px, 0px, 0) scale(1)";

const sheet = (offset: string): ModalPositionMotion => ({
  variants: {
    hidden: { opacity: 0, transform: offset },
    visible: {
      opacity: 1,
      transform: REST,
      transition: {
        transform: tween(modalTime.move, modalEase.pour),
        opacity: tween(modalTime.light, modalEase.fade),
      },
    },
    exit: {
      opacity: 0,
      transform: offset,
      transition: {
        transform: tween(modalTime.reveal, modalEase.glide),
        opacity: tween(modalTime.reveal, modalEase.fade, modalTime.leave),
      },
    },
  },
});

const focusing = {
  hidden: hazy(3),
  visible: {
    ...SHARP,
    transition: tween(step(0), modalEase.silk, step(-3)),
  },
};

const modalMotion: ModalMotion = {
  backdrop: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: tween(step(1), modalEase.fade) },
    exit: { opacity: 0, transition: tween(modalTime.reveal, modalEase.fade) },
  },
  content: focusing,
  header: focusing,
  footer: focusing,
  positions: {
    center: {
      variants: {
        hidden: {
          opacity: 0,
          transform: "translate3d(0px, 0px, 0) scale(0.96)",
        },
        visible: {
          opacity: 1,
          transform: REST,
          transition: {
            transform: tween(step(1), modalEase.silk),
            opacity: tween(step(0), modalEase.fade),
          },
        },
        exit: {
          opacity: 0,
          transform: "translate3d(0px, 0px, 0) scale(0.98)",
          transition: tween(modalTime.reveal, modalEase.fade),
        },
      },
      transition: tween(step(1), modalEase.silk),
    },
    top: sheet("translate3d(0px, -100%, 0) scale(1)"),
    right: sheet("translate3d(100%, 0px, 0) scale(1)"),
    bottom: sheet("translate3d(0px, 100%, 0) scale(1)"),
    left: sheet("translate3d(-100%, 0px, 0) scale(1)"),
  },
};

const modalThemeConfig = defineTheme(modalTheme, {
  slots: {
    backdrop: `fixed inset-0 cursor-pointer ${BACKDROP}`,
    dim: `pointer-events-auto absolute inset-0 cursor-pointer ${DIM}`,

    layer: [
      "pointer-events-none fixed inset-0 flex flex-col data-[inset=true]:px-3",
      "data-[position=center]:items-center data-[position=center]:justify-center",
      "data-[position=top]:items-center data-[position=top]:justify-start",
      "data-[position=bottom]:items-center data-[position=bottom]:justify-end",
      "data-[position=left]:items-start data-[position=left]:justify-start",
      "data-[position=right]:items-end data-[position=right]:justify-start",
    ].join(" "),
    frame: [
      "pointer-events-none relative flex max-w-full flex-col select-none data-[active=true]:pointer-events-auto data-[active=true]:select-auto",
      "data-[layout=center]:w-full sm:data-[layout=center]:w-auto",
      "data-[layout=left]:w-auto data-[layout=right]:w-auto",
      "data-[layout=top]:w-full data-[layout=top]:self-stretch data-[layout=top-mobile]:w-full data-[layout=top-mobile]:self-stretch",
      "data-[layout=bottom]:w-full data-[layout=bottom]:self-stretch data-[layout=bottom-mobile]:w-full data-[layout=bottom-mobile]:self-stretch",
      "data-[layout=side-mobile]:w-full data-[layout=side-mobile]:self-stretch",
    ].join(" "),

    panel: "modal-panel ui-motion relative flex flex-col",
    panelBare:
      "overflow-visible bg-transparent ring-1 ring-transparent ring-inset",
    panelChrome: [
      `overflow-hidden ${SHELL}`,
      "data-[layout=center]:rounded-shell",
      "data-[layout=top]:rounded-b-shell data-[layout=top]:border-t-0",
      "data-[layout=bottom]:rounded-t-shell data-[layout=bottom]:border-b-0",
      "data-[layout=top-mobile]:w-full data-[layout=top-mobile]:rounded-b-shell data-[layout=top-mobile]:border-x-0 data-[layout=top-mobile]:border-t-0",
      "data-[layout=bottom-mobile]:w-full data-[layout=bottom-mobile]:rounded-t-shell data-[layout=bottom-mobile]:border-x-0 data-[layout=bottom-mobile]:border-b-0",
      "data-[layout=left]:h-screen data-[layout=left]:max-h-screen data-[layout=left]:w-full data-[layout=left]:rounded-r-shell data-[layout=left]:border-l-0",
      "data-[layout=right]:h-screen data-[layout=right]:max-h-screen data-[layout=right]:w-full data-[layout=right]:rounded-l-shell data-[layout=right]:border-r-0",
      "data-[layout=side-mobile]:h-screen data-[layout=side-mobile]:max-h-screen data-[layout=side-mobile]:w-full data-[layout=side-mobile]:self-stretch data-[layout=side-mobile]:rounded-none data-[layout=side-mobile]:border-0",
    ].join(" "),

    content:
      "flex min-h-0 flex-col overflow-hidden data-[height=capped]:max-h-[70dvh] data-[height=full]:h-full data-[height=full]:max-h-full",
    body: "modal-body min-h-0 w-full flex-1 overflow-y-auto overscroll-contain p-2.5 pt-0 first:pt-2.5",

    row: "items-center gap-2.5 p-2.5 pl-4 data-[columns=2]:flex data-[columns=2]:justify-between data-[columns=3]:grid data-[columns=3]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] data-[sticky]:bg-glass data-[sticky]: data-[sticky=bottom]:sticky data-[sticky=bottom]:bottom-0 data-[sticky=top]:sticky data-[sticky=top]:top-0",
    rowCenter: "flex items-center justify-center",
    rowEnd: "flex min-w-0 items-center justify-end gap-2.5",
    rowStart: "min-w-0",
    title: "truncate type-copy font-semibold text-ink",
    closeButton: `ui-iris center relative inline-flex size-control-sm cursor-pointer rounded-full text-ink-body hover:text-ink focus-visible:text-ink ${FILL}`,

    switcher: "center shrink-0 gap-2 border-t border-rule bg-fill p-2.5",
    switcherButton: `flex h-control-sm cursor-pointer items-center gap-1.5 rounded-full px-3.5 type-meta font-medium text-ink-body *:shrink-0 hover:text-ink focus-visible:text-ink ${FILL}`,
    switcherCurrent:
      "flex h-control-sm items-center rounded-full bg-fill-active px-3.5 type-meta font-medium ring-1 ring-edge-hover ring-inset",
    switcherDivider: "type-meta text-ink-faint",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.MODAL_BACKDROP },
    dim: { zIndex: Z_INDEX.MODAL_BACKDROP },
    row: { zIndex: Z_INDEX.MODAL_STICKY_HEADER },
  },
  motion: modalMotion,
});

const { durations: notificationTime, easings: notificationEase } = motion;

const enter = tween(notificationTime.light, notificationEase.fade);

const notificationMotion: NotificationMotion = {
  transition: enter,
  toast: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: enter },
    exit: {
      opacity: 0,
      transition: tween(notificationTime.leave, notificationEase.fade),
    },
  },
};

const notificationThemeConfig = defineTheme(notificationTheme, {
  slots: {
    layer:
      "ui-motion pointer-events-none fixed inset-x-0 bottom-2 mx-auto flex w-full max-w-[380px] flex-col items-center justify-center px-4",
    toast: `pointer-events-auto flex h-control-md w-full cursor-pointer items-center justify-center rounded-full px-5 type-meta font-medium text-ink select-none hover:ring-edge-focus focus-visible:ring-edge-focus ${FLOAT}`,
    toastDocked: "absolute inset-x-0 top-[calc(100%+6px)] z-20",
    toastMessage: "truncate text-center type-meta font-medium text-ink",
  },
  styles: {
    layer: { zIndex: Z_INDEX.NOTIFICATION },
  },
  motion: notificationMotion,
});

export const themes = Object.freeze([
  errorThemeConfig,
  ambientThemeConfig,
  contextMenuThemeConfig,
  controlsThemeConfig,
  dockThemeConfig,
  modalThemeConfig,
  notificationThemeConfig,
]);
