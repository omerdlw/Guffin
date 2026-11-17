import { dockTheme } from "@omerdlw/base-framework/dock";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { SKELETON } from "@/design/components/skeleton";
import { TOOLTIP } from "@/design/components/tooltip";
import { RADIUS } from "@/design/foundations/geometry";
import { BACKDROP, FLOAT, GLASS, TIP } from "@/design/foundations/layers";
import {
  PRIMARY,
  WELL as WELL_FILL,
  WELL_HOVER,
} from "@/design/foundations/tones";
import { Z_INDEX } from "@/design/foundations/z-index";
import { dockMotion } from "./dock-motion";

const INNER = "rounded-card";

const WELL = `${WELL_FILL} ${WELL_HOVER}`;

const CONTROL_BUTTON = `ui-iris center relative size-control-chrome shrink-0 cursor-pointer text-ink-body hover:text-ink focus-visible:text-ink ${FLOAT}`;

const MEDIA_ICON_BUTTON = `ui-iris center relative size-control-sm cursor-pointer rounded-full text-ink-body hover:text-ink focus-visible:text-ink ${WELL}`;

const TONE_MUTED = `text-ink-body hover:text-ink focus-visible:text-ink ${WELL}`;
const TIP_SHAPE = "rounded-full px-3 py-1.5 type-meta font-medium";

export const dockThemeConfig = defineTheme(dockTheme, {
  slots: {
    stack:
      "dock-root ui-motion @container fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none",
    backdrop: `fixed inset-0 cursor-pointer ${BACKDROP}`,

    card: [
      // Every card with content is glass of its own. The collapsed cards
      // behind the front one are not drawn at all once the deck has folded
      // (dock.css): nothing to paint or filter until the stack opens.
      "dock-card group @container absolute h-auto w-full overflow-hidden rounded-shell p-3 cursor-pointer liquid liquid-flat liquid-lens [--liquid-tint:var(--liquid-tint-dock)] data-[placement=top]:[--liquid-drop:var(--liquid-shadow)]",
      // A shelf's corner is concentric with the pill it holds: the 32px
      // control (16px corner) sits 6.5px in on every side, so the shelf
      // turns at 22.5px.
      "data-[anchored=true]:cursor-default data-[shelf=true]:rounded-[22.5px] data-[shelf=true]:px-[6.5px] data-[shelf=true]:py-0",
      // A shelf is a strip of controls whose foot hides under the card in
      // front: a thin rim, or the strip turns into one lens bending the page
      // behind its pills, and its lower rim shows through the front card.
      "data-[shelf=true]:[--liquid-bezel:14]",
      "data-[placement=top]:inset-0 data-[placement=top]:h-full data-[placement=bottom]:bottom-0 data-[placement=float]:top-0 data-[placement=float]:[#dock-card-stack[data-controls-hidden=false]_&]:h-full",
    ].join(" "),
    // Clipped for the card's height animation, but with room for the wells'
    // hairline and shadow: the action buttons sit flush with this box's
    // edges, and a plain overflow-hidden shaved their sides and foot. The
    // margin only widens what paints (the framework measures offsetHeight).
    cardContent:
      "flow-root w-full overflow-clip [overflow-clip-margin:4px] data-[shelf=true]:min-h-dock-shelf",
    cardSurface: `w-full overflow-hidden ${INNER}`,
    cardShelf:
      "relative flex h-dock-shelf-bar w-full items-center justify-between",
    cardStandard: "w-full",
    cardHud: "relative flex w-full items-center justify-between",
    cardBody: "relative flex h-auto w-full flex-col gap-2.5",
    // MovieAction and friends can render nothing; an empty footer would still
    // take the body's gap below the header.
    cardFooter: "relative w-full overflow-visible has-[>:empty]:hidden",
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
    iconGlyph: `center size-12 shrink-0 ${INNER} text-ink ${WELL}`,
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
    surfaceBody: ` @container w-full overflow-hidden ${INNER}`,

    controls:
      "pointer-events-none absolute inset-x-0 bottom-[calc(100%+12px)] select-none flex items-center justify-center gap-1",
    controlAction: "pointer-events-auto flex shrink-0 items-center",
    controlBack: "pointer-events-auto shrink-0",
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
    mediaSpeed: `center h-control-sm cursor-pointer rounded-full px-3.5 type-meta font-medium tabular-nums text-ink-body select-none hover:text-ink focus-visible:text-ink data-[active=true]:bg-grade/15 data-[active=true]:text-grade data-[active=true]:ring-grade/25 data-[active=true]:hover:bg-grade/20 data-[active=true]:focus-visible:bg-grade/20 data-[active=true]:hover:text-grade data-[active=true]:hover:ring-grade/30 data-[active=true]:focus-visible:ring-grade/30 ${WELL}`,
    mediaSkip: MEDIA_ICON_BUTTON,
    mediaToggle: `flex size-control-sm cursor-pointer items-center justify-center rounded-full text-ink-body select-none hover:text-ink focus-visible:text-ink data-[active=true]:bg-grade/15 data-[active=true]:text-grade data-[active=true]:ring-grade/25 data-[active=true]:hover:bg-grade/20 data-[active=true]:focus-visible:bg-grade/20 data-[active=true]:hover:text-grade data-[active=true]:hover:ring-grade/30 data-[active=true]:focus-visible:ring-grade/30 ${WELL}`,
    mediaMute:
      "center size-5 cursor-pointer p-0 text-ink-body hover:text-ink focus-visible:text-ink",
    mediaVolume: `group flex h-control-sm items-center gap-1.5 rounded-full px-3 select-none data-[active=true]:bg-(--liquid-well-hover) ${WELL}`,
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

    // dock-action: rises in on arrival (dock.css) and takes the glass
    // touch every button on the page has (liquid-touch.ts).
    action: `dock-action liquid-touch ui-sheen center h-control-md w-full ${INNER} gap-2 px-4 type-control font-medium cursor-pointer select-none`,
    actionActive: PRIMARY,
    actionFill: "min-w-0 flex-1 justify-center whitespace-nowrap",
    actionLabel: "truncate",
    actionMuted: TONE_MUTED,
    actionRow: "flex w-full items-center gap-2.5",
    actionStack: "flex flex-col gap-2.5",
    actionSurface: WELL,
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
