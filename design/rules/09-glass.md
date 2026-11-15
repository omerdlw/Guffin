# 10. Liquid glass

One material for everything that floats: the dock, modals, menus, tooltips,
toasts, carousel arrows and controls laid over a picture. A related, lighter
material covers controls lying on the page. Sources:

| File                                   | What                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| `src/design/styles/liquid.css`         | The classes: material, frost, lens, clear, control         |
| `src/design/liquid.tsx` (`LiquidLens`) | Draws the glint mask and the refraction filter per surface |
| `src/design/styles/themes.css`         | `--liquid-*` and `--glass-control-*` values per theme      |
| `src/design/liquid-touch.ts`           | Press and lean for `.liquid-touch` controls (section 4.1)  |
| `src/design/components/glass-thumb.ts` | Springs for thumbs that turn to glass (switch, segmented)  |

`LiquidLens` and `LiquidTouch` are mounted once in `src/app/providers.tsx`.

### 10.1 The classes

Combine a material class with what it does to the scene behind it.

| Class                  | Effect                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `liquid`               | The material: `--liquid-tint` fill, a 0.5px `--liquid-contour` just outside the edge, the layer shadow, and the glint (`::after`) |
| `liquid-flat`          | No shadow (contour stays): a control on a page or picture, or a card inside another layer                                         |
| `liquid-frost`         | Backdrop: `--liquid-frost` (blur, saturate, tone) in every browser                                                                |
| `liquid-lens`          | Backdrop: refraction at the bezel, then frost, then edge light, as one SVG filter (Chromium); elsewhere the frost                 |
| `liquid-clear`         | The lens without frost; nothing at all outside Chromium (a drop of water: the cursor)                                             |
| `liquid-prism`         | On clear glass over a picture: the colour channels split at the rim                                                               |
| `liquid-fluid`         | No per-size maps; keeps the gradient rim (a surface that morphs every frame)                                                      |
| `liquid-control`       | The page-control material (section 10.4)                                                                                          |
| `liquid-control-clear` | The page-control material with no tint until touched (`outline` buttons)                                                          |

Variables a surface may set: `--liquid-bezel` (rim width, px), `--liquid-bend`
(× the full lens strength), `--liquid-drop` (its own shadow; `liquid-flat`
sets it to none).

A component that takes the material drops its `bg-*`, `ring-*` and
`backdrop-*` classes: a ring utility would replace the material's box-shadow.

### 10.2 The named layers

`foundations/layers.ts` and `tones.ts`:

| Name                                       | Classes                                                      | For                                            |
| ------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| `SHELL`                                    | `liquid liquid-lens`                                         | Modal, context menu, select menu, toasts       |
| `FLOAT`                                    | `liquid liquid-flat liquid-lens`                             | Dock controls (back, close, header buttons)    |
| `TIP`                                      | `liquid liquid-frost text-ink-lead`                          | Tooltips, the dock's command tips              |
| `GLASS`                                    | `liquid liquid-flat`                                         | The dock's status card                         |
| `TONES.glass`, `TONE.glass`, `TONE.arrows` | `liquid liquid-flat liquid-lens` (+ `rounded-full text-ink`) | A control over a picture; carousel arrows      |
| `BACKDROP`                                 | `bg-veil`                                                    | What veils the page behind the dock or a modal |
| `DIM`                                      | `bg-dim`                                                     | A modal left under the top one                 |

The dock's cards are `liquid liquid-flat liquid-lens`, and a top-placed card
gets its shadow back (`--liquid-drop: var(--liquid-shadow)`).

### 10.3 Tokens

| Token                      | Dark                                                       | Light                             |
| -------------------------- | ---------------------------------------------------------- | --------------------------------- |
| `--liquid-tint` / `-hover` | page 28% / page 30% + ink 10%                              | white 34% / 50%                   |
| `--liquid-rim-light`       | the page's hue at L 0.86, chroma ×2 (≤0.05)                | —                                 |
| `--liquid-rim`             | rim light at 40%                                           | `#fff`                            |
| `--liquid-rim-blend`       | `plus-lighter` (adds light)                                | `normal`                          |
| `--liquid-contour`         | black 50%                                                  | ink 9%                            |
| `--liquid-shadow`          | `0 2px 6px -2px` black 35% + `0 12px 32px -12px` black 55% | `var(--lift)`                     |
| `--liquid-frost`           | `blur(12px) saturate(1.6) brightness(0.92)`                | `blur(12px) saturate(1.25)`       |
| `--liquid-lens-tone`       | `saturate(1.5) brightness(0.9)`                            | `saturate(1.2)`                   |
| `--liquid-well` / `-hover` | white 7% / 11%                                             | white 50% / 72%                   |
| `--liquid-well-shadow`     | none                                                       | ink 6% hairline + 1px ink 5% fall |

Under `prefers-reduced-transparency: reduce`, `.liquid` is `--plate` (solid).

### 10.4 Controls on the page

Buttons (`neutral`, `outline`), a select's trigger, an `Input` and a
segmented track lying on the page are `liquid-control`: there is nothing
behind them to bend, so no lens and no frost; a light glass, a bevel lit from
above and a contour.

| Token                                    | Dark                                                         | Light                                         |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `--glass-control` / `-hover` / `-active` | ink 6 / 10 / 14%                                             | white 50 / 72 / 90%                           |
| `--glass-control-bevel`                  | rim-light 7% top line, black 22% foot, rim-light 3% hairline | `#fff` top line, ink 5% foot, ink 7% hairline |
| `--glass-control-contour`                | 0.5px black 55%                                              | a 1px fall in the page's hue at 14%           |
| `--glass-control-focus`                  | inset 1px `--edge-focus`                                     | the same                                      |

| Tone / part                                                | Material                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `neutral` button, select trigger, `Input`, segmented track | Glass (`liquid-control`)                                         |
| `outline` button                                           | Clear (`liquid-control-clear`): bevel and contour, tint on touch |
| `ghost`, `primary`, `chosen`, `danger`, `armed`            | Their own fill; touch only                                       |
| `glass` (over a picture)                                   | The full lens                                                    |

The rule is unlayered and scoped
`.liquid-control:not(:where(.dock-root, .liquid, [role="dialog"]) *)`: on the
page it replaces the tone's fill and ring; inside a layer the tone's fill
stays. **Never glass on glass**: inside the dock a control is a `WELL`
(`bg-(--liquid-well)`) with `WELL_HOVER`.

### 10.5 The lens engine (`liquid.tsx`)

Every `.liquid` element is treated as a slab of glass with a rounded bezel.
A `ResizeObserver` fits two maps to it:

- **Specular map**: where the curved rim catches a light from the top left
  (a 0.5px hairline core fading over 0.35px, a soft bloom out to ~8px,
  brightest on the corners facing the light). It is an alpha mask, laid as a
  nine-slice `mask-box-image` (`--liquid-specular`), coloured by the theme's
  `--liquid-rim`. Until it is drawn, a gradient rim stands in.
- **Displacement map** (`liquid-lens`, Chromium only): rays meet a convex
  squircle profile and refract by Snell's law (n 1.5); the scene bends at
  the rim and stays still in the middle. Red bends 7% more, blue 7% less
  (dispersion). The filter then frosts (σ 4px), and adds the **edge light**:
  the scene caught in the bezel, ×1.4 and saturated 1.35, blurred 1.75px.
  Clear glass over text bends half as much and glows less (gain 1.25), so
  letters at the rim stay letters.

Neither map depends on the surface's size, only its corner radius and bezel
(a third of the short side, 6–28px), so each is drawn once for a small square
and laid out as nine slices. A surface that resizes (the dock unfolding into a
surface) keeps the exact glint and lens every frame.

Measured facts the engine relies on:

- Chromium runs SVG filters in `backdrop-filter` at device resolution;
  `feDisplacementMap` samples nearest-neighbour, so bent content is blurred
  after. Maps are drawn at device density; masks are supersampled 4×4.
- A blur after displacement treats the outside of the filter region as
  transparent, so the region is grown by 3σ past the edge.
- Changing an SVG filter's attributes re-renders it: lenses are moved per
  frame (nine-slice), never redrawn.
- An animated resize of a `liquid-lens` leaves the old filter region behind;
  while the size moves, the lens hands over to a size-free frost and redraws
  once it settles.

### 10.6 Thumbs that turn to glass

The segmented control's indicator and the switch's knob are solid at rest.
Pressed, dragged, or crossing to a new choice, they swell into clear liquid
glass that bends what lies under them, and settle solid again. One element
with `liquid liquid-lens`; the swell is `scale` with a constant height (so its
maps stay cached); solid → glass is an inline
`color-mix(var(--rest) X%, var(--liquid-tint))`. `glass-thumb.ts` steps the
springs at a fixed rate on one frame loop that stops when everything rests;
a per-trip latch keeps the spring's overshoot from turning it back to glass.

### 10.7 Rules

- Reuse the material. Do not build another refraction, mask or lens system
  for a control.
- Never blur, fade or scale an ancestor of glass: the frost is cut off from
  the page behind, then pops back. The dock never fades its stack.
- Spring-driven per-frame styles must not sit under a choreography `follow`
  transition (`[data-pill]`, `.choreo-segmented`): the transition lags the
  spring.
- A surface opening is a new card and the old one becomes a ghost; any delay
  in hiding the ghost shows two panes of glass overlapping.
- Check glass in dark: light theme hides glint differences. Check over a
  bright picture too (`/tahoe` is a bare wallpaper page for this).
