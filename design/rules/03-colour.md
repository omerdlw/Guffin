# 3. Foundations: colour and opacity

### 3.1 Colour

Tailwind's palette is switched off: every colour is a role.

#### Ink: text and glyphs on the page

| Token            | Value | Role                                                      |
| ---------------- | ----- | --------------------------------------------------------- |
| `text-ink`       | 100   | Titles, names, fact values, the hovered state of anything |
| `text-ink-lead`  | 90    | A tagline; tooltip text                                   |
| `text-ink-body`  | 70    | Prose, secondary text, section titles, idle controls      |
| `text-ink-muted` | 50    | Labels, dates, counts, meta, label-sized text actions     |
| `text-ink-faint` | 30    | Placeholder glyphs in empty frames, separators, numerals  |

`ink-lead` is never a hover state. `ink-faint` is never a date or a count.

#### Surfaces

| Token                             | Value       | Role                                             |
| --------------------------------- | ----------- | ------------------------------------------------ |
| `bg-fill` / `-hover` / `-active`  | 5 / 10 / 15 | A surface at rest, hovered, chosen               |
| `ring-edge` / `-hover` / `-focus` | 5 / 10 / 15 | Its inset ring, in the same states               |
| `bg-rule`, `divide-rule`          | 5           | Dividers between rows                            |
| `bg-line`                         | 10          | Tracks, axes, a timeline spine                   |
| `bg-plate`                        | 5, opaque   | `fill` made solid, for a frame laid over another |

#### Grade: the colour taken from the picture

| Use                         | Value                                        |
| --------------------------- | -------------------------------------------- |
| Chosen control              | `bg-grade/15 ring-grade/25`, hover `20 / 30` |
| Header rule                 | `bg-grade/20` drawn, `bg-grade/40` hairline  |
| Focus outline, section icon | 40, 85                                       |
| Text selection              | 30                                           |

Without a grade (no picture behind), the focus outline is 20% white.

#### Semantic colours

| Token                                 | Role                                         |
| ------------------------------------- | -------------------------------------------- |
| `watched`, `listed`, `liked`, `rated` | What a member did with a film                |
| `danger`                              | An error, a destructive action               |
| `award`                               | A statuette: the Oscars index, the year dial |

Danger takes the grade's steps: text `text-danger`; a soft button
`bg-danger/15 ring-danger/25` (hover `20 / 30`); a destructive action armed for
its second press `bg-danger text-on-accent` (`TONES.armed`).

#### Page, layers and the primary action

| Token                   | Dark                      | Light                   | Role                                           |
| ----------------------- | ------------------------- | ----------------------- | ---------------------------------------------- |
| `bg-page`               | ambient shadow, near #000 | ambient hue at L 0.95   | The page; a curtain over it                    |
| `bg-glass`              | page at 70%               | page lifted 8% to white | Chrome: dock, menus, modals, tooltips     |
| `bg-veil`               | page at 60%               | white at 60%            | A control or backdrop laid over a picture      |
| `bg-dim`                | page at 30%               | ink at 20%              | What sits behind a modal                       |
| `bg-primary` / `-hover` | ink / ink 90%             | ink / ink lifted 14%    | The one action a surface exists for            |
| `text-on-primary`       | page                      | white                   | Ink on the primary action                      |
| `text-on-accent`        | page                      | white                   | Ink on a solid grade or danger fill            |

- **Data marks** use the ink steps as colours: `bg-line` for the track or axis,
  `bg-ink-faint` / `bg-ink-muted` / `bg-ink-body` for marks, `bg-ink` for the
  current one. A progress fill is `bg-ink-body`.
- **`primary`** is the submit action, a checked switch, a thumb riding its
  track and the text caret. A chosen control is never primary.
- **A scrim under text on a picture** is `from-page/80` inside `on-photo`.
- `white` and `black` survive only as aliases for the framework's defaults;
  product code never names them.

### 3.2 Opacity

Opacity moves in steps of 5%, for colour (`bg-grade/15`) and for elements.

| Case                      | Value                        |
| ------------------------- | ---------------------------- |
| Disabled                  | `opacity-50`                 |
| A picture link, hovered   | `opacity-80`                 |
| An idle picture in a list | Rests at 70, comes up to 100 |
