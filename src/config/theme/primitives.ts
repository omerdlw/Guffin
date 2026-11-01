import { primitivesTheme } from "@/ui";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { SHELL } from "./chrome";

const DISABLED = "disabled:cursor-not-allowed disabled:opacity-50";
const LAYER = "col-start-1 row-start-1";
const FIELD_BOX = `w-full ${DISABLED}`;

export const primitivesThemeConfig = defineTheme(primitivesTheme, {
  slots: {
    adaptiveImage: `h-full w-full opacity-0 data-[fill]:absolute data-[fill]:inset-0 data-[fill]:select-none data-[state=loaded]:opacity-100`,
    adaptiveImageFallback: "relative h-full w-full overflow-hidden select-none",
    adaptiveImageFrame:
      "relative h-full w-full overflow-hidden bg-fill select-none",

    avatar:
      "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-fill-hover text-ink-body select-none",
    avatarFallback:
      "flex h-full w-full items-center justify-center type-meta font-medium uppercase",
    avatarImage: "h-full w-full object-cover",

    backdropHero:
      "relative isolate h-80 w-[calc(100%+2rem)] -translate-x-4 overflow-hidden sm:h-96 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(36rem,52vw,44rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32 xl:h-[clamp(40rem,56vw,48rem)] xl:w-[calc(100%+24rem)] xl:-translate-x-48",
    backdropHeroGradient: "pointer-events-none absolute inset-0 z-10",
    backdropHeroImage: "absolute inset-0 bg-cover bg-no-repeat",

    button:
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:aria-busy:cursor-wait disabled:aria-busy:opacity-100",

    input: FIELD_BOX,
    textarea: `block ${FIELD_BOX}`,

    loader: "shrink-0 leading-none select-none pointer-events-none",
    loaderInline: "inline-flex items-center justify-center",
    spinner:
      "inline-flex animate-spin items-center justify-center align-middle leading-none",
    stack: "inline-grid place-items-center",
    stackBase: `invisible select-none ${LAYER}`,
    stackTop: `center ${LAYER}`,

    selectCheck: "shrink-0 text-ink",
    selectChevron:
      "cine-turn shrink-0 text-ink-muted group-aria-expanded:rotate-180 group-aria-expanded:text-ink",
    selectContent: `ui-motion absolute top-full left-0 mt-1.5 max-h-64 w-full overflow-y-auto overscroll-contain p-1 backdrop-blur-xl ${SHELL}`,
    selectEmpty: "px-3 py-2 text-center type-meta text-ink-muted",
    selectIcon: "ui-glyph shrink-0 text-ink-body",
    selectOption: `flex cursor-pointer items-center justify-between gap-2.5 px-3 py-2 type-body text-ink-body select-none data-[highlighted]:text-ink aria-selected:font-medium aria-selected:text-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-50`,
    selectOptionBody: "flex min-w-0 flex-col",
    selectOptionContent: "flex min-w-0 items-center gap-2.5",
    selectOptionDescription: "truncate type-meta text-ink-muted",
    selectPlaceholder: "truncate text-ink-muted",
    selectRoot: "relative inline-flex w-full flex-col gap-1.5",
    selectText: "truncate",
    selectTrigger: `cine-fade group flex w-full items-center justify-between gap-2 bg-fill px-3.5 py-2.5 text-left type-body text-ink ring-1 ring-edge ring-inset hover:bg-fill-hover hover:ring-edge-hover aria-expanded:bg-fill-hover aria-expanded:ring-edge-focus ${DISABLED}`,
    selectTriggerContent: "flex min-w-0 items-center gap-2 truncate",

    switch: `group/switch ui-still relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-fill-hover p-0.5 ring-1 ring-edge ring-inset transition-[background-color,box-shadow,outline-color,outline-offset] duration-reveal ease-out-cream hover:bg-fill-active hover:ring-edge-hover data-[state=checked]:bg-white data-[state=checked]:ring-white data-[state=checked]:hover:bg-white/90 ${DISABLED}`,
    switchThumb: `pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-ink-body shadow-knob transition-[translate,width,background-color] duration-reveal ease-out-cream group-hover/switch:bg-ink-lead group-active/switch:w-6 data-[state=checked]:translate-x-4 data-[state=checked]:bg-black group-active/switch:data-[state=checked]:translate-x-3`,

    tooltip: "tooltip-content pointer-events-none select-none",
  },
  styles: {
    loaderInline: { height: "1em" },
    selectContent: { zIndex: Z_INDEX.SELECT },
    tooltip: { zIndex: Z_INDEX.TOOLTIP },
  },
});
