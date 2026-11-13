import {
  type ModalMotion,
  type ModalPositionMotion,
  modalTheme,
} from "@omerdlw/base-framework/modal";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { BACKDROP, DIM, SHELL } from "@/design/foundations/layers";
import { FILL } from "@/design/foundations/tones";
import { Z_INDEX } from "@/design/foundations/z-index";
import { hazy, motion, SHARP, step, tween } from "@/motion/time";

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

export const modalThemeConfig = defineTheme(modalTheme, {
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
    layer: { zIndex: Z_INDEX.MODAL },
    row: { zIndex: Z_INDEX.MODAL_STICKY_HEADER },
  },
  motion: modalMotion,
});
