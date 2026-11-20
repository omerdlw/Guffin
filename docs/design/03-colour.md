# 3. Foundations: colour and opacity

### 3.1 Colour

Tailwind's palette is switched off (`--color-*: initial`): every colour is a
role. A role is a CSS variable valued once in
`src/design/styles/themes.css`, exposed to Tailwind as a `--color-*` token in
`styles/system/tokens.css` or `styles/tokens.css`.

#### Where the colours come from

There is one theme, **paper**, built from one colour: **the page**, which
follows the picture on screen. There is no dark mode and no `data-theme`;
a role has one value.

```
picture ──► framework ambient, ground "light" (lib/ambient.ts, server and client)
              ├─► --ambient-page      ──► --page   paper, L ~0.955, the mood's hue
              ├─► --ambient-vibrant   ──► --grade  the accent, ≥ 4.5:1 on the page
              ├─► --ambient-top/right/left/bottom  pale glows (L 0.8–0.9), Room's wash
              └─► --ambient-presence  0…1, how much colour: the wash's opacity
```

There is one colour pipeline. Nothing else samples a picture: a stage hands
its picture to the framework (`light` on a stage root, `useStageLight` in
`design/ambient.ts`), a page chrome hands it the server's palette.

Ink is **one colour**, `--ink-rgb` (`17 19 24`, near black). Every ink step
and every ink-based role (edges, rules, lines, dim) is that black at an
opacity, never a separate grey: `rgb(var(--ink-rgb) / a)`.

#### Ink: text and glyphs

| Token            | Ink opacity | Role                                                      |
| ---------------- | ----------: | --------------------------------------------------------- |
| `text-ink`       |         100 | Titles, names, fact values, the hovered state of anything |
| `text-ink-lead`  |          88 | A tagline; tooltip text                                   |
| `text-ink-body`  |          74 | Prose, secondary text, section titles, idle controls      |
| `text-ink-muted` |          56 | Labels, dates, counts, meta, label-sized text actions     |
| `text-ink-faint` |          34 | Placeholder glyphs in empty frames, separators, numerals  |

`ink-lead` is never a hover state. `ink-faint` is never a date or a count.

#### Surfaces

| Token                    | Value             | Role                                         |
| ------------------------ | ----------------- | -------------------------------------------- |
| `bg-fill`                | white 45%         | A surface at rest                            |
| `bg-fill-hover`          | white 70%         | Hovered                                      |
| `bg-fill-active`         | white 90%         | Pressed / active                             |
| `bg-fill-lift`           | `#fff` (solid)    | A highlight on glass (menu options)          |
| `ring-edge`              | ink 8%            | Its inset ring at rest                       |
| `ring-edge-hover`        | ink 12%           | Hovered                                      |
| `ring-edge-focus`        | ink 20%           | Focused                                      |
| `bg-rule`, `divide-rule` | ink 8%            | Dividers between rows                        |
| `bg-line`                | ink 12%           | Tracks, axes, a timeline spine               |
| `bg-plate`               | white 70% in page | `fill` made opaque, for a frame over another |

Surfaces are white sheets with ink hairlines, never ink breathed onto the
page.

#### Page, layers and the primary action

| Token              | Value                      | Role                                      |
| ------------------ | -------------------------- | ----------------------------------------- |
| `bg-page`          | `--ambient-page` (L 0.955) | The page; a curtain over it               |
| `bg-glass`         | white 35% in page (oklab)  | A solid stand-in for glass                |
| `bg-veil`          | page 60%                   | A control or backdrop laid over a picture |
| `bg-dim`           | ink 20%                    | What sits behind a modal                  |
| `bg-primary`       | ink                        | The one action a surface exists for       |
| `bg-primary-hover` | ink 86% mixed with white   |                                           |
| `text-on-primary`  | `#fff`                     | Ink on the primary action                 |
| `text-on-accent`   | `#fff`                     | Ink on a solid grade or danger fill       |

Floating chrome is not `bg-glass`; it is the liquid material (section 10),
valued by the `--liquid-*` tokens.

- **`primary`** is the submit action, a checked switch track and the text
  caret. A chosen control is never primary.
- **Data marks** use the ink steps: `bg-line` for the track or axis,
  `bg-ink-faint` / `-muted` / `-body` for marks, `bg-ink` for the current one.
  A progress fill is `bg-ink-body`.
- **`white` and `black`** are Tailwind's own: real white and black. Product
  code still names roles, not them.

#### On a photograph: `.on-photo`

Text over a picture is the one place ink is light. Wrap it in `.on-photo`:
it sets `--page` to `#0b0c0e`, light ink, grade-tinted chosen, dark glass
and the nominal weights (400/500/600), so every role inside reads
light-on-dark. A scrim under such text is `from-page/80` inside `.on-photo`.
It is the only second value a role may have.

#### Grade: the colour taken from the picture

On film, person, profile and home pages the accent is the **grade**:
the palette's `vibrant` role (the picture's most vivid colour). The
framework makes it for paper, so it holds 4.5:1 on the page and needs no
darkening here.

1. Page chromes (`MoviePageChrome`, `ShowPageChrome`, `PersonPageChrome`,
   the account hero) call `useAmbientTheme` with the page picture and the
   palette the server made (`getAmbientPalette`, cached per analysis
   version and ground).
2. A stage root takes `light`: a picture URL lays that picture's light over
   the page (home's lead, a gallery picture on a film with `lightLinger={0}`),
   `null` hands the page back neutral at once (spotlights, legal).
3. `--grade` is `--ambient-vibrant` mixed into ink by `--ambient-presence`
   (a grey picture gives ink, a faint one nearly ink); `.on-photo` does the
   same with the light end of the ramp, `--ambient-vibrant-80`.
4. Without a picture every grade role is ink.

| Use                        | Token / value                                                                   |
| -------------------------- | ------------------------------------------------------------------------------- |
| Chosen control             | `TONE.chosen`: `bg-chosen ring-chosen-edge text-chosen-ink`                     |
|                            | a `#fff` sheet, ink 12% ring (16% hover), ink text                              |
|                            | in `.on-photo`: grade 15% fill, 25% ring, grade ink; hover 20 / 30              |
| `text-grade`, `bg-grade/N` | `--color-grade` / `--color-accent`: `var(--grade)`                              |
| Text selection             | `--selection`: grade 30%                                                        |
| A chosen row in a surface  | `rowVariants({ intent: "chosen" })`: `bg-grade/15 ring-grade/25`, hover ring 30 |

The framework writes the palette on `<html>`, which restyles every element
(~12ms per write on a detail page). It is written when the picture changes,
never per frame.

#### Semantic colours

| Token       | Value              | `.on-photo`            | Role                                   |
| ----------- | ------------------ | ---------------------- | -------------------------------------- |
| `watched`   | oklch(57% .15 150) | `#00e054`              | Watched                                |
| `listed`    | oklch(55% .16 252) | `#40bcf4`              | In a list / watchlist                  |
| `liked`     | oklch(60% .17 44)  | `#ff9010`              | Liked                                  |
| `rated`     | oklch(69% .15 70)  | oklch(82.8% .189 84.4) | A lit star                             |
| `rated-off` | ink 16%            | ink 15%                | An unlit star                          |
| `danger`    | oklch(55% .2 26)   | oklch(70.4% .191 22.2) | An error, a destructive action         |
| `award`     | oklch(60% .115 78) | `#e9c46a`              | A statuette: the Oscars, the year dial |

On paper each holds at least 3.5:1 against the page as a glyph (a star,
being a mark of light, stays brighter at ~2.5:1). A state that is on lights
its icon in its colour: `COLLECTION_MARKS` (`features/movie/movie.ts`) maps
like, watched and watchlist to `text-liked`, `text-watched`, `text-listed`;
`ActionButton` takes it as `mark`, the friends surface as its signals.

Danger takes the grade's steps: text `text-danger`; a soft button
`TONES.danger` (`bg-danger/15 ring-danger/25`, hover `20 / 30`); a destructive
action armed for a second press `TONES.armed` (`bg-danger text-on-accent`).
Confirmations go through `useConfirm` (a dock HUD), so `armed` is rarely
needed.

#### The room's atmosphere

`Room` (`components/room.tsx`) lays a wash, a sheen, a vignette and grain over
the picture. The wash is the picture's four region glows, pale on paper; it
shows as much as the picture has colour (`opacity: var(--ambient-presence)`).
Its strengths are tokens:

| Token                                    | Value                  |
| ---------------------------------------- | ---------------------- |
| `--wash-top/right/left/bottom` (ambient) | 26 / 22 / 20 / 22%     |
| `--sheen-a` (top-left white)             | 0.4                    |
| `--vignette-rgb` / `-a` / `-edge`        | `22 24 29` / .07 / .02 |

### 3.2 Opacity

Opacity moves in steps of 5%, for colour (`bg-grade/15`) and for elements.

| Case                      | Value                           |
| ------------------------- | ------------------------------- |
| Disabled                  | `opacity-50` (`STATE.disabled`) |
| A picture link, hovered   | `opacity-80`                    |
| An idle picture in a list | Rests at 70, comes up to 100    |

Theme variables may sit off the 5% grid (ink opacities 88/74/56/32, light
edges 8/12) because they are tuned in `themes.css`; call sites never do.
