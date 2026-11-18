# 3.4–3.8 Foundations: radius, geometry, spacing, layout, depth, stacking

### 3.4 Radius

Corners sit on a 4px grid and are named by what they round. CSS
`--radius-*` in `styles/system/tokens.css`; the TypeScript mirror is `RADIUS`
in `foundations/geometry.ts` (for props that take a number and inline
styles).

| Token           | px  | For                                                    |
| --------------- | --- | ------------------------------------------------------ |
| `rounded-mark`  | 3   | A data mark: chart bar, calendar cell                  |
| `rounded-thumb` | 8   | Thumbnails, logos, small posters; a row's end button   |
| `rounded-inset` | 10  | Derived: a card (16) less a tile's 6px padding         |
| `rounded-tile`  | 12  | List rows; a select's small option                     |
| `rounded-card`  | 16  | Cards, carousels, menu options, tooltips, buttons      |
| `rounded-panel` | 20  | Cast cards, review cards, episode cards                |
| `rounded-sheet` | 24  | The poster, the context menu, a pill select's menu     |
| `rounded-shell` | 28  | Derived: a card plus the 12px gutter of dock and modal |
| `rounded-full`  | —   | Pills, tabs, avatars, round buttons                    |

Tailwind's radii and arbitrary ones are off; `rounded-none` and
`rounded-[inherit]` remain.

**Nested frames keep their curves parallel.** The inner radius is the outer
one minus the padding between them: `nested(outer, padding)`. A tile of 16
with `p-1.5` holds 10 (`rounded-inset`); the dock's shelf holds a 32px pill
(16 corner) 6.5px in, so it turns at 22.5px.

**A carousel's ends wear its cards' corners.** The track clips its picture
band to the radius of the first card's frame, so a card scrolled half out is
cut along a curve equal to its own. Captions under the frames stay square.

### 3.5 Control geometry

Every interactive block sits on one height ladder, so controls side by side
share a baseline and a centre line. A rung fixes the whole box: height,
inline padding, gap, glyph and type step travel together (`PARTS.button.root`
in `recipes.ts`).

| Size     | Height class       | px  | Padding | Gap | Type      | For                                       |
| -------- | ------------------ | --- | ------- | --- | --------- | ----------------------------------------- |
| `xs`     | `h-control-xs`     | 24  | 10      | 4   | `label`   | Badges, inline chips                      |
| `sm`     | `h-control-sm`     | 32  | 14      | 6   | `meta`    | Compact toolbars, media controls          |
| `chrome` | `h-control-chrome` | 36  | 16      | 8   | `control` | Dock and modal chrome; a row's end action |
| `md`     | `h-control-md`     | 40  | 16      | 8   | `control` | The default; menu items; toasts           |
| `lg`     | `h-control-lg`     | 48  | 20      | 10  | `body`    | Hero actions, touch-first rows            |

A square control is `size-control-*` (`<Button icon>` adds it and drops the
padding). Fields (`Input`) take `sm md lg`; selects and segmented controls
`sm md`. A height off the ladder (`h-7`, `h-9`, `h-11`) on a control is a bug;
on an avatar, a picture or a mark it is not a control and is free.

Glyphs: 16px in a control (`glyph16`), 20px by default (`Icon`), 18px on
carousel arrows, 12/14px in a segmented control.

### 3.6 Spacing

Tailwind's 4px spacing scale is in use for padding and gaps. Two named sets
sit beside it (`styles/tokens.css`, `@theme static`):

| Token             | px                       | For                                                                          |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `fib-1` … `fib-7` | 5, 8, 13, 21, 34, 55, 89 | Fibonacci rhythm (`gap-fib-5`, `p-fib-3`): pages written on the golden ratio |
| `dock-shelf`      | 96                       | The dock's shelf card (`min-h-dock-shelf`)                                   |

Shared sizes that CSS reads go in `@theme static`: Tailwind v4 drops a custom
property declared on a class inside `@layer components` while keeping its
`var()` uses.

### 3.7 Page layout

`src/design/foundations/layout.ts`:

| Export                                                           | What                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `PAGE_CLASS`                                                     | Full height, bottom padding = dock height + 2rem             |
| `CONTAINER_CLASS`                                                | `max-w-6xl`, gutters 16 / 24 / 32px, no scroll anchoring     |
| `OVERLAP`                                                        | Pulls the body up over the hero: −128 / −192 / −256 / −288px |
| `bodyClass(hasBackdrop)`                                         | The detail grid: one column, then `18rem                     | 1fr`(lg),`24rem | 1fr` (xl) |
| `pageBodyClass(hasBackdrop)`                                     | A single stacked column with the page rhythm                 |
| `HEADER_CLASS`, `ASIDE_CLASS`, `MAIN_COLUMN_CLASS`, `VIEW_CLASS` | Grid placement of header, sidebar, main                      |
| `SIDEBAR_CLASS`, `FACT_ROW_TYPE`                                 | The facts sidebar                                            |
| `CAROUSEL_ITEM`                                                  | 3 per row, 4 from `md`                                       |
| `CAROUSEL_WIDE_ITEM`                                             | 1 per row, 2 from `sm`                                       |
| `RULE_GAP`                                                       | `mt-10 mb-6` around a heading's rule                         |

The vertical rhythm between blocks is `gap-8 sm:gap-10 lg:gap-12`.

**The golden plan** (`styles/utilities.css`): `plan` is a grid that, from
64rem, splits at φ (`--cut` 61.8%) with a `fib-5` gutter (`fib-6` from 80rem);
children take `plan-main` or `plan-aside`. `--phi` (1.618034) is available to
CSS.

### 3.8 Depth and stacking

Tailwind's shadows are switched off. Depth has these cues and nothing else:

| Cue               | What it draws                                                | On                                                      |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| Glass             | The liquid material: tint, contour, bend, frost (section 10) | Everything that floats                                  |
| Ring              | `ring-1 ring-inset ring-edge*`                               | Fills, fields, buttons                                  |
| `lift`            | A layer's fall onto paper, tinted by the page                | Floating layers (`--lift` also feeds `--liquid-shadow`) |
| `--liquid-shadow` | `--lift`; in `.on-photo` a tight and a long black shadow     | Layers that are not `liquid-flat`                       |

Cards, tiles, pictures and marks never lift. Over a picture (`.on-photo`)
`lift` is none: a layer is told from it by its glass, contour and frost.

**Stacking** uses `Z_INDEX` (`foundations/z-index.ts`) only. An ESLint rule
rejects `z-30` and above and `z-[…]` in class strings; `z-0/10/20` are free
for local stacking.

| Layer                        | z         |
| ---------------------------- | --------- |
| Dock backdrop / dock         | 100 / 110 |
| Toasts                       | 120       |
| Modal backdrop / modal       | 130 / 140 |
| Select menu                  | 150       |
| Loading / error overlay      | 160 / 170 |
| Context menu backdrop / menu | 180 / 190 |
| Tooltip                      | 200       |

Inside the dock and the modal: card background 0, content and stack 10,
badge 20, media 30, surface popover 30; modal frame 1, sticky header 10. Two
recipes write a literal z (`z-[150]` on the select menu, `z-[200]` on the
tooltip) with an ESLint exemption that names the `Z_INDEX` entry it mirrors.
