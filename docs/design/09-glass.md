# 10. Liquid glass

One material for everything that floats: the dock, modals, menus, tooltips,
toasts, carousel arrows and controls laid over a picture. A related, lighter
material covers controls lying on the page. Sources:

| File                                | What                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| `src/design/styles/liquid.css`      | The classes: material, frost, lens, clear, control          |
| `src/design/glass/` (`GlassEngine`) | The engine: optics, materials, maps, per-surface filters    |
| `src/design/styles/themes.css`      | `--liquid-*` and `--glass-control-*` values (+ `.on-photo`) |
| `src/design/glass/liquid-touch.ts`  | Press and lean for `.liquid-touch` controls (section 4.1)   |
| `src/design/glass/spring.ts`        | Springs for thumbs that turn to glass (switch, segmented)   |

`GlassEngine` and `LiquidTouch` are mounted once in `src/app/providers.tsx`.

### 10.1 The classes

Combine a material class with what it does to the scene behind it.

| Class                  | Effect                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `liquid`               | The material: `--liquid-tint` fill, a 0.5px `--liquid-contour` just outside the edge, the layer shadow and the lit rim (10.5)                                           |
| `liquid-flat`          | No shadow (contour stays): a control on a page or picture, or a card inside another layer                                                                               |
| `liquid-frost`         | Backdrop: `--liquid-frost` (blur, saturate, tone) in every browser                                                                                                      |
| `liquid-lens`          | Backdrop: refraction at the bezel, then frost, then edge light, as one SVG filter (Chromium); elsewhere the frost                                                       |
| `liquid-clear`         | The lens without frost or `--liquid-lens-tone` (the ink under it stays ink); nothing at all outside Chromium (a drop of water: the cursor, a segmented or switch thumb) |
| `liquid-prism`         | On clear glass over a picture: the colour channels split at the rim                                                                                                     |
| `liquid-fluid`         | No per-size maps; keeps the gradient rim (a surface that morphs every frame)                                                                                            |
| `liquid-control`       | The page-control material (section 10.4)                                                                                                                                |
| `liquid-control-clear` | The page-control material with no tint until touched (`outline` buttons)                                                                                                |

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

| Token                      | Paper                                                                          | `.on-photo`                                                |
| -------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `--liquid-stain`           | 1: the lens takes the page's hue, keeps its light (not on clear glass)         | 0                                                          |
| `--liquid-tint` / `-hover` | page 30% / white 38%                                                           | page 16% / page 20% + ink 10%                              |
| `--liquid-tint-dock`       | `--liquid-tint`                                                                | page 6% (the picture shows through the dock)               |
| `--liquid-contour`         | ink 9%                                                                         | black 50%                                                  |
| `--liquid-shadow`          | `var(--lift)`                                                                  | `0 2px 6px -2px` black 35% + `0 12px 32px -12px` black 55% |
| `--liquid-frost`           | `blur(12px) saturate(1.25)`                                                    | `blur(12px) saturate(1.6) brightness(0.92)`                |
| `--liquid-lens-tone`       | levels 0.4–0.95, paper → paper: `saturate(1.7) contrast(.42) brightness(1.38)` | highlights to 0.72: `saturate(1.3) brightness(.72)`        |
| `--liquid-well` / `-hover` | white 50% / 72%                                                                | white 7% / 11%                                             |
| `--liquid-well-shadow`     | ink 6% hairline + 1px ink 5% fall                                              | none                                                       |

Under `prefers-reduced-transparency: reduce`, `.liquid` is `--plate` (solid).

### 10.4 Controls on the page

Buttons (`neutral`, `outline`), a select's trigger, an `Input` and a
segmented track lying on the page are `liquid-control`: there is nothing
behind them to bend, so no lens and no frost; a light glass, the lit rim
(10.5) and a contour.

| Token                                    | Paper                               | `.on-photo`       |
| ---------------------------------------- | ----------------------------------- | ----------------- |
| `--glass-control` / `-hover` / `-active` | white 50 / 72 / 90%                 | ink 6 / 10 / 14%  |
| `--glass-control-bevel`                  | ink 7% hairline                     | white 3% hairline |
| `--glass-control-contour`                | a 1px fall in the page's hue at 14% | 0.5px black 55%   |
| `--glass-control-focus`                  | inset 1px `--edge-focus`            | the same          |

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

### 10.5 The glass engine (`src/design/glass/`)

| File           | What                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `optics.ts`    | Pure maths: the rim's pull (a sphere's cap), Abbe dispersion               |
| `materials.ts` | The kinds of glass as data: `shell`, `float`, `tip`, `clear`, `prism`      |
| `maps.ts`      | Draws the bend and the edge light for a corner radius + bezel              |
| `png.ts`       | Encodes the maps as PNG without a canvas; deflates them for storage        |
| `engine.tsx`   | Fits every `.liquid` with its maps, builds its SVG filter, moves its light |

A surface's glass is its `data-glass`, else read from its classes:
`liquid-prism` → prism, `liquid-clear` → clear, `liquid-lens liquid-tip` →
tip, `liquid-lens liquid-flat` → float, `liquid-lens` → shell. A plain
`liquid` gets no lens.

The numbers follow iOS 26.5's glass (reverse-engineered in
`robinwongm/liquid-glass`, `platform/ios26_5.ts`): the regular recipe for
surfaces, the lens variant for thumbs and drops.

| Material | ior / Abbe | Rim (share of short side, px)       | Pull (× rim) | Frost σ (48→160px) | For                         |
| -------- | ---------- | ----------------------------------- | ------------ | ------------------ | --------------------------- |
| `shell`  | 1.52 / 28  | 0.25, 4–20                          | 3            | 1.5 → 3            | Modal, menu, select, toast  |
| `float`  | 1.52 / 28  | 0.25, 4–20; past 80px +0.2/px to 40 | 3            | 1.25 → 2.5         | Dock, controls on a picture |
| `tip`    | 1.52 / 28  | 0.25, 4–20                          | 3            | 5                  | Tooltips                    |
| `clear`  | 1.52 / —   | 0.18, 4–20                          | 2.8          | 0                  | Thumbs, the cursor's drop   |
| `prism`  | 1.52 / 14  | 0.18, 4–20                          | 2.8          | 0                  | Clear glass over a picture  |

- **Rim**: narrow and strong, as iOS's. The outline shows the scene a few
  rims further in (`reach`), falling off as a sphere's cap
  (`1 − √(1 − (1 − t)²)`): steep at the outline, flat a rim's width in. The
  rim moves in 2px steps (a resizing card reuses its maps); the pull is the
  filter's `scale`, so one map serves every material.
- **Bend** (`liquid-lens`, Chromium only): each colour channel through its
  own index from the Abbe number (the pull grows with n − 1). Then the frost
  (σ grows with the surface, set in place as it resizes), then the **edge
  light**: the scene caught in the bezel, saturated and brightened.
- **Levels, not blur**: legibility comes from `--liquid-lens-tone` pressing
  the scene's range (iOS's face colour matrix), so the frost stays light.
- **Edge light is directional**: a key light from the top left and a fill
  from the bottom right (iOS's −45° / 135°, ±90° spread), in the scene's own
  colours. Straight sides glow, the top-left and bottom-right corners most,
  the other two go dark.
- **The rim is lit, never a wire.** No even white hairline all round and no
  top-only line: the rim follows the two lights (10.5).
- `--liquid-bend` overrides are × the full pull: the segmented thumb takes
  0.08, the switch knob 0.18, the cursor's card lens 0.32 (with a 10px rim).

A dock shelf takes a 14px rim and is clipped to its bar
(`--spacing-dock-shelf-bar`, dock.css): the rest of it runs on under the
surface's card and showed through it. The engine refits a surface when its
`class`, `data-glass`, `data-shelf` or `data-placement` changes.

The maps depend only on corner radius and bezel, are drawn once for a small
square and laid out as nine slices, so a resizing surface keeps them exact.

The engine's cost rules (measured; keep them when changing it):

- **Read in the ResizeObserver, never mid-task.** Every fit reads in one
  pass (one `getComputedStyle` per surface), then writes. A mutation or a
  hydration retry does not fit on the spot: it observes the surface anew,
  and the ResizeObserver reports it in the same frame, after layout and
  before paint, where the read is free.
- **Maps are pixels, not canvases.** `maps.ts` writes RGBA arrays and
  `png.ts` encodes them (stored deflate): byte-for-byte the pixels the
  canvas made, ~3.6× faster, no GPU readback.
- **Maps outlive the page.** Drawn maps go to `localStorage`
  (`guffin:glass-maps`, deflated in idle time, ≤ 64 keys) under a version
  hashed from the drawing code and one probe map: a reload or a new tab fits
  every lens without drawing. Change the drawing and the version changes
  by itself.

Measured facts the engine relies on:

- Chromium runs SVG filters in `backdrop-filter` at device resolution;
  `feDisplacementMap` samples nearest-neighbour, so bent content is blurred
  after. Maps are drawn at device density; masks are supersampled.
- A blur after displacement treats the outside of the filter region as
  transparent, so the region is grown by 3σ past the edge.
- Changing an SVG filter's attributes re-renders it: lenses are moved per
  frame (nine-slice), never redrawn.

### 10.6 Thumbs that turn to glass

The segmented control's indicator and the switch's knob are solid at rest.
Pressed, dragged, or crossing to a new choice, they swell into clear liquid
glass that bends what lies under them, and settle solid again. One element
with `liquid liquid-lens`; the swell is `scale` with a constant height (so its
maps stay cached); solid → glass is an inline
`color-mix(var(--rest) X%, var(--liquid-tint))`. `glass/spring.ts` steps the
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
- Check glass on paper and over a picture: paper hides rim differences, a
  bright picture shows them.

### 10.5 Light

One light rig for every glass edge: a **key** up and to the left, a weaker
**fill** back from the lower right (Apple's −45° / 135°). Each stretch of edge
is lit by where it faces; the edges between fall to a shade.

`.liquid`, a `liquid-control` on the page and `.rim` (the `chosen` tone)
draw it in `::after`: a `--rim-width` ring cut from a conic laid round the
shape (`liquid.css`). A field (`input`, `textarea`) cannot carry a
pseudo-element and takes the two lights as offset inset shadows.

| Token         | Paper     | `.on-photo` |
| ------------- | --------- | ----------- |
| `--rim-width` | 1px       | the same    |
| `--rim-key`   | white 95% | white 42%   |
| `--rim-fill`  | white 60% | white 18%   |
| `--rim-shade` | ink 7%    | black 20%   |

In Chromium the lens adds its own edge light in the scene's colours, from
the same two directions. Never light an edge from one side only, and never
give `::after` to an element that takes the rim.
