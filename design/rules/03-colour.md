# 3. Foundations: colour and opacity

### 3.1 Colour

Tailwind's palette is switched off (`--color-*: initial`): every colour is a
role. A role is a CSS variable valued per theme in
`src/design/styles/themes.css`, exposed to Tailwind as a `--color-*` token in
`styles/system/tokens.css` or `styles/tokens.css`.

`system/palette.css` holds older values for the same variables under
`:where()` (zero specificity). `themes.css` overrides every one; read and
edit `themes.css`.

#### Where the colours come from

Both themes are built from one colour: **the page**, which follows the
picture on screen.

```
picture ──► framework ambient ──► --ambient-shadow (+ --ambient-top/right/left/bottom)
                                     │
            dark:  --page = --ambient-shadow (near #000)
            light: --page = oklch(from --ambient-shadow 0.95 clamp(0.012, c·0.7, 0.045) h)
                                     │
            --ink  = oklch(from --page  0.985 min(c,0.008) h)   dark
                     oklch(from --page  0.19  min(c,0.02)  h)   light
            ink steps = color-mix(in oklab, --ink N%, --page)
```

So every ink step carries a trace of the scene's hue, and is **solid, never
see-through**: a label reads the same over a fill, glass or a picture.

`--ink-rgb` (dark `252 252 251`, light `17 19 24`) is the raw channel triple
for the alpha-based roles (fills, edges, lines).

#### Ink: text and glyphs

| Token            | Dark (% ink in page) | Light | Role                                                      |
| ---------------- | -------------------: | ----: | --------------------------------------------------------- |
| `text-ink`       |                  100 |   100 | Titles, names, fact values, the hovered state of anything |
| `text-ink-lead`  |                   90 |    90 | A tagline; tooltip text                                   |
| `text-ink-body`  |                   72 |    76 | Prose, secondary text, section titles, idle controls      |
| `text-ink-muted` |                   54 |    58 | Labels, dates, counts, meta, label-sized text actions     |
| `text-ink-faint` |                   32 |    34 | Placeholder glyphs in empty frames, separators, numerals  |

`ink-lead` is never a hover state. `ink-faint` is never a date or a count.

#### Surfaces

| Token                    | Dark (ink alpha)      | Light             | Role                                         |
| ------------------------ | --------------------- | ----------------- | -------------------------------------------- |
| `bg-fill`                | 5%                    | white 45%         | A surface at rest                            |
| `bg-fill-hover`          | 10%                   | white 70%         | Hovered                                      |
| `bg-fill-active`         | 15%                   | white 90%         | Pressed / active                             |
| `bg-fill-lift`           | = fill-hover          | `#fff` (solid)    | A highlight on glass (menu options)          |
| `ring-edge`              | 5%                    | ink 8%            | Its inset ring at rest                       |
| `ring-edge-hover`        | 10%                   | ink 12%           | Hovered                                      |
| `ring-edge-focus`        | 15%                   | ink 20%           | Focused                                      |
| `bg-rule`, `divide-rule` | 5%                    | ink 8%            | Dividers between rows                        |
| `bg-line`                | 10%                   | ink 12%           | Tracks, axes, a timeline spine               |
| `bg-plate`               | ink 5% in page, solid | white 70% in page | `fill` made opaque, for a frame over another |

Dark surfaces are light breathed onto the page; light surfaces are white
sheets with ink hairlines. Neither is computed from the other.

#### Page, layers and the primary action

| Token              | Dark                      | Light                     | Role                                      |
| ------------------ | ------------------------- | ------------------------- | ----------------------------------------- |
| `bg-page`          | ambient shadow, near #000 | ambient hue at L 0.95     | The page; a curtain over it               |
| `bg-glass`         | ink 4% in page (srgb)     | white 35% in page (oklab) | A solid stand-in for glass                |
| `bg-veil`          | page 60%                  | page 60%                  | A control or backdrop laid over a picture |
| `bg-dim`           | page 30%                  | ink 20%                   | What sits behind a modal                  |
| `bg-primary`       | ink                       | ink                       | The one action a surface exists for       |
| `bg-primary-hover` | ink 90%                   | ink 86% mixed with white  |                                           |
| `text-on-primary`  | page                      | `#fff`                    | Ink on the primary action                 |
| `text-on-accent`   | page                      | `#fff`                    | Ink on a solid grade or danger fill       |

Floating chrome is not `bg-glass`; it is the liquid material (section 10),
valued by the `--liquid-*` tokens.

- **`primary`** is the submit action, a checked switch track and the text
  caret. A chosen control is never primary.
- **Data marks** use the ink steps: `bg-line` for the track or axis,
  `bg-ink-faint` / `-muted` / `-body` for marks, `bg-ink` for the current one.
  A progress fill is `bg-ink-body`.
- **`white` and `black`** are aliases (`--color-white: var(--ink)`,
  `--color-black: var(--page)`) kept for framework defaults; product code
  never names them.

#### On a photograph: `.on-photo`

Text over a picture keeps the dark palette in either theme. Wrap it in
`.on-photo`: in light it resets `--page` to `#0b0c0e` and the weights to the
dark ones, so every role inside reads as dark. A scrim under such text is
`from-page/80` inside `.on-photo`.

#### Grade: the colour taken from the picture

On film, show, person and profile pages the accent is the **grade**, read
from the artwork by `src/design/grade.ts`:

1. `useGrade(value)` takes a picture URL (sampled at 48px wide), a `Tint`
   (`{ l, c, h }` in OKLCH) or `null`. Every stage root calls it with the
   page's `grade` prop.
2. The sampler weights pixels by chroma² across 24 hue slices and keeps the
   strongest hue.
3. `write()` sets on `<html>`: `--tint` (the hue as seen), `--tint-presence`
   (0 or 1), `--light` and `--grade` (an `r g b` triple). On paper the tint
   is darkened (L −0.24) and saturated (C ×1.3) so it reads on white.
   It re-runs when `data-theme` changes.
4. Without a picture, `--grade` is unset and every grade role falls back to
   `--ink-rgb`.

| Use                          | Token / value                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Chosen control               | `TONE.chosen`: `bg-chosen ring-chosen-edge text-chosen-ink`                     |
|                              | dark: grade 15% fill, 25% ring, grade ink; hover 20 / 30                        |
|                              | light: a `#fff` sheet, ink 12% ring (16% hover), ink text                       |
| `text-grade`, `bg-grade/N`   | `--color-grade` / `--color-accent`: `rgb(var(--grade, var(--ink-rgb)))`         |
| Focus outline on page scopes | `--focus-ring-grade`: grade 70% in dark; light keeps the ink ring               |
| Text selection               | `--selection`: grade 30%                                                        |
| A chosen row in a surface    | `rowVariants({ intent: "chosen" })`: `bg-grade/15 ring-grade/25`, hover ring 30 |

Writing `--grade` on `<html>` restyles every element (~12ms per write on a
detail page). It is written when the grade changes, never per frame.

#### Semantic colours

| Token       | Dark                   | Light              | Role                                   |
| ----------- | ---------------------- | ------------------ | -------------------------------------- |
| `watched`   | `#00e054`              | oklch(62% .19 150) | Watched                                |
| `listed`    | `#40bcf4`              | oklch(60% .14 236) | In a list / watchlist                  |
| `liked`     | `#ff9010`              | oklch(66% .18 52)  | Liked                                  |
| `rated`     | oklch(82.8% .189 84.4) | oklch(70% .16 82)  | A lit star                             |
| `rated-off` | ink 15%                | ink 16%            | An unlit star                          |
| `danger`    | oklch(70.4% .191 22.2) | oklch(58% .21 26)  | An error, a destructive action         |
| `award`     | `#e9c46a`              | oklch(68% .12 85)  | A statuette: the Oscars, the year dial |

Danger takes the grade's steps: text `text-danger`; a soft button
`TONES.danger` (`bg-danger/15 ring-danger/25`, hover `20 / 30`); a destructive
action armed for a second press `TONES.armed` (`bg-danger text-on-accent`).
Confirmations go through `useConfirm` (a dock HUD), so `armed` is rarely
needed.

#### The room's atmosphere

`Room` (`components/room.tsx`) lays a wash, a sheen, a vignette and grain over
the picture. Its strengths are theme tokens, so each theme tunes them:

| Token                                    | Dark            | Light                  |
| ---------------------------------------- | --------------- | ---------------------- |
| `--wash-tint-a` / `-b`                   | 10% / 5%        | 16% / 10%              |
| `--wash-top/right/left/bottom` (ambient) | 0               | 26 / 22 / 20 / 22%     |
| `--sheen-a` (top-left white)             | 0.018           | 0.4                    |
| `--vignette-rgb` / `-a` / `-edge`        | black / .4 / .1 | `22 24 29` / .07 / .02 |

### 3.2 Opacity

Opacity moves in steps of 5%, for colour (`bg-grade/15`) and for elements.

| Case                      | Value                           |
| ------------------------- | ------------------------------- |
| Disabled                  | `opacity-50` (`STATE.disabled`) |
| A picture link, hovered   | `opacity-80`                    |
| An idle picture in a list | Rests at 70, comes up to 100    |

Theme variables may sit off the 5% grid (light ink steps 76/58/34, light
edges 8/12) because they are tuned per theme; call sites never do.
