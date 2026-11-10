# 6.6–6.7 Motion: scroll, navigation and colour

### 6.6 Scroll, navigation and hand-over

- **The wheel is a force.** `<EngineProvider drive>` (in `providers.tsx`) turns
  each wheel step into a target and follows it with a critically damped spring
  whose period is `step(1 + tempo)`: a heavy page scrolls heavily. The browser's
  own scrolling (keyboard, scrollbar, touch, anchors) is adopted, never
  blocked. Nested scrollers, `data-scroll-native`, locked pages (`overflow: hidden`, or
  `data-scroll-lock` while a select is open, 4.4), horizontal and
  Ctrl/⌘ wheels are left alone. A dock surface's scroll box carries
  `data-scroll-native` and `overscroll-contain`.
- **Leaving is a contract.** `StageRoot` holds the framework's navigation. A
  trip to another path plays `stage.leave()` on every part, together, by matter,
  and the route is requested when the stage is `gone`. A change of query or hash
  is not a leave (`leaves` overrides this). A cancelled trip calls
  `stage.stay()`. Navigate with `useDockActions().navigate` or a framework
  link, never `router.push`, which skips the hold.
- **Hand-over.** `usePart("poster", { carry: "poster" })` lets a pressed picture
  fly to its twin on the next page, for `step(min(rung + tempo - 1, 2))` on
  `glide`. No page uses it for posters now: film and person pages always open
  on the title card (`Marquee`), so no picture flies in under it.
- **Reduced motion.** Everything arrives at once, over `step(-1)`, by opacity
  alone: no movement, depth, drift or wheel driving. The clock sleeps when
  nothing moves, caps a frame at 1/20 s, and writes `will-change` only while
  moving. Without JavaScript, `[data-part]` is simply visible. In CSS the same rule
  holds: `[data-cinematic]` keeps colour and opacity transitions at `step(-3)` and
  drops scale, translate and filter; `ui-develop` and the tooltip fade in by
  opacity alone.

### 6.7 Colour: the room comes from the picture

`StageRoot grade={…}` takes a picture URL (the engine reads its tone), a `Tint`,
or `null` (a dark room). One hue is taken from the picture's coloured mid-tones;
lightness and chroma are fixed (OKLCH 0.74 / 0.1), so every page has the same
light in a different colour. It crosses the hue circle by the short way over
`step(3)` and is published on `<html>` as `--tint`, `--tint-presence`, `--light`
and `--grade` (the channels behind `bg-grade/15` and `text-grade`). The colour
is handed over between pages, and stays until the next page reads its own
picture. `Room` paints the light (wash, grain, lens glass, house lights) and has
no motion; the grain is a file of its own (`/grain.png`), preloaded with the
document and laid from the first render, so it is there at the first paint and
is never faded in. `useShowing` dims the house by φ⁻¹ while a modal stands in front.
