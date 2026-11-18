# 5. Components and recipes

### 5.1 Pick the component

| You need                                  | Use                                                                |
| ----------------------------------------- | ------------------------------------------------------------------ |
| Any button                                | `<Button intent size shape icon width>`                            |
| A link drawn as a button                  | `<Link className={ui.parts.button.root({ intent, size, shape })}>` |
| A link: a card, a row, running text       | `<Link variant>`, `<DockLink variant>`, `<ExternalLink variant>`   |
| A text action (Read more, Show it anyway) | `<TextButton variant>` (`inline`, `reveal`, `label`, `quiet`)      |
| A picture                                 | `<Image layout fit>` (framework); never a bare `<img>`             |
| A toggle on a detail page                 | `<ActionButton>`                                                   |
| What a dock action shows                  | `<ActionIcon>`, `<ActionLabel>` (never a bare `Icon` and span)     |
| A confirmation                            | `useConfirm()` (a dock HUD), `useConfirmedAction()`                |
| The button that shows the rest of a list  | `<Button intent="neutral" shape="pill" width="full">`              |
| A text field                              | `<Input size shape>`, `<Textarea>`                                 |
| A choice that applies at once             | `<Switch>`                                                         |
| A row that is checked                     | `<CheckboxIndicator>` inside the row; `<Checkbox>` alone           |
| A select                                  | `<Select size shape>`                                              |
| Tabs that switch a view                   | `<SegmentedControl size shape width>`                              |
| A picture that is a target                | `<MediaCard aspect framed>` in a `<Carousel>`                      |
| A label on hover                          | `<Tooltip>`                                                        |
| A row or tile inside a surface            | `rowVariants({ intent })`, `tileVariants()` and the anatomy        |
| Floating chrome over a picture            | `TONE.glass`; carousel arrows `TONE.arrows`                        |
| A small caps label                        | `TONE.label`                                                       |
| Dividers between rows                     | `TONE.rule`, `TONE.rules`                                          |
| Long-form reading                         | `PROSE_CLASS` (`PROSE_TYPE`)                                       |
| A page headline                           | `headlineClass()`, `HEADLINE_*`                                    |

### 5.2 Layers

The dock, modals, the context menu, toasts and tooltips are cut from one
material, liquid glass (section 10). The named layers are in
`foundations/layers.ts` and `tones.ts`:

| Name                  | Classes                                         | For                                       |
| --------------------- | ----------------------------------------------- | ----------------------------------------- |
| `SHELL`               | `liquid liquid-lens`                            | Modal, context menu, select menu, toasts  |
| `FLOAT`               | `liquid liquid-flat liquid-lens`                | Dock controls                             |
| `TIP`                 | `liquid liquid-frost text-ink-lead`             | Tooltips (`TOOLTIP.content`), dock tips   |
| `GLASS`               | `liquid liquid-flat`                            | The dock's status card                    |
| `BACKDROP`            | `bg-veil`                                       | What veils the page behind a layer        |
| `DIM`                 | `bg-dim`                                        | A layer left under the top one            |
| `FILL`                | `fill` / `edge`, one step up on hover           | A control inside a layer outside the dock |
| `WELL` + `WELL_HOVER` | `--liquid-well(-hover)`, `--liquid-well-shadow` | A control or tile inside the dock         |
| `PRIMARY`             | `TONES.primary`                                 | The one action a layer exists for         |

Shells hold content on the card scale: the dock card is `rounded-shell` (28,
12px padding), the context menu `rounded-sheet` (24), and what sits inside is
`rounded-card`. A select's menu is `SHELL` at `rounded-card` (a pill select's
menu: `rounded-sheet`).

Controls lying on the page are glass too (`liquid-control`, section 10.4);
inside a layer they keep their fill. Never glass on glass.

**Inside the dock there is one control tone.** `.dock-root` (themes.css)
points `--fill`, `--fill-hover` and `--edge` at the well
(`--liquid-well`, `--liquid-well-hover`, `--liquid-well-edge`), so a field,
a segmented track, a select, a sheet of rows and a tile are the same white
behind the same hairline. Don't give a dock control its own tone.

**Layer motion**: the dock and its surfaces are choreographed; modal, menu
and toast still open and close in one cut (section 6.8).

### 5.3 Inside a surface

`components/surface` holds the stage a dock surface plays in (`SurfaceStage`,
`SurfacePart`, `DockAction`), the row and tile recipes (`rowVariants`,
`tileVariants`) and the tile's anatomy (`SURFACE_TEXT`, `SURFACE_TITLE`,
`SURFACE_META`, `SURFACE_TILE_INNER` …).

- **A surface is staged.** Its root is `<SurfaceStage>` (it holds the
  autofocus anchor); blocks, rows and notes are `SurfacePart`s and swapped
  views `SurfaceSwap`s (section 4.1 of the interaction rules). `DockAction`
  is a stage without a part: its buttons rise on their own.
- **Tiles and rows carry no ring.** A tile or row is a `WELL`
  (`tileVariants`, `rowVariants`); only a chosen row takes the grade ring
  (`rowVariants({ intent: "chosen" })`). Rings stay on fields and buttons.
- **Surfaces don't share one look.** Pick the shape that fits the content
  rather than stacking a card per row:
  - _A list of people or things_ (follows, notifications, the settings
    overview) is **one sheet**: `SURFACE_GROUP` holds `groupRowVariants()` rows
    that share one hover (`useHighlight(key, GROUP_HIGHLIGHT)`); people sit in
    round avatars. A long overview splits into sheets under `TONE.label`
    names.
  - _One choice among a few_ (a show's status) is a **grid of tiles**
    (`choiceVariants`, content in `CHOICE_BODY`): glyph above, name below; the
    chosen tile is the grade itself. What the choice means is one caption
    under the grid, not a line in every tile.
  - _Things with pictures_ (lists) are **cards with covers** in a two-column
    grid; chosen wears the grade ring and a check on the cover.
  - _Empty or failed_ is a centred note (`StatusTile`), never a row.
- **Text in a tile** is a title over a meta line with no gap (`SURFACE_TEXT`).
- **Radius inside a tile:** buttons and icon tiles are `rounded-inset`.
- **A list of rows shares one hover.** `HighlightGroup` and `useHighlight`
  slide a single `bg-fill` after the pointer or the keyboard focus, so a row
  sets no hover background of its own.
- **The action a surface exists for** (Save, Update review, Create, Add
  passkey) is always `<Button intent="primary">`. Grade marks a chosen state,
  never a submit.
- **A text action at the end of a row** (Unfollow, Remove, Reject) is
  `<Button intent="outline" shape="thumb" size="chrome">`: a hairline, no fill,
  36px so it sits 8px from the tile's top, bottom and right, with the `thumb`
  radius so its corners are concentric with the card's (16 = 8 + 8). The
  primary one beside it (Follow, Accept) takes the same size and shape. An
  action that is hard to undo (Unfollow) asks first with `useConfirm()`.
- **A long list is searchable.** From 30 rows (`SURFACE_SEARCH_MIN`) a list in a
  surface opens with `<SurfaceSearch>` above it, driven by `useSurfaceSearch`
  (case, accent and dotless-i insensitive; every word must match). A shorter
  list shows no field.
- **An icon button inside a tile** is bare (36px, no fill, no ring) and takes
  `bg-fill-hover` on hover.
- **A chosen button or row** uses the same grade steps as `TONE.chosen`.

### 5.4 The variant API

Every component is driven by props. A framework component's look lives in
`PARTS` (`src/design/recipes.ts`, `defineRecipe`); a Guffin component's in
its own file, written with CVA through `variants()`
(`foundations/variants.ts`). Both merge with `cn`: a caller's class replaces
the recipe's class of the same family instead of both landing in the DOM.
A recipe can be called directly: `ui.parts.button.root({ intent: "primary" })`.

```tsx
<Button intent="primary">Save</Button>
<Button intent="ghost" icon shape="pill" size="sm" aria-label="Close">…</Button>
<Select options={…} value={v} onChange={setV} size="sm" shape="pill" />
<SegmentedControl items={…} value={tab} onChange={setTab} size="md" width="fill" />
<Link className={ui.parts.button.root({ width: "full" })} href="/">Home</Link>
```

The props mean the same thing on every component:

| Prop     | Values                                                                         |
| -------- | ------------------------------------------------------------------------------ |
| `intent` | `neutral`, `outline`, `chosen`, `primary`, `danger`, `armed`, `glass`, `ghost` |
| `size`   | a rung of the ladder: `xs`, `sm`, `chrome`, `md`, `lg`                         |
| `shape`  | `card`, `pill` (and `thumb` for a button)                                      |
| `width`  | `auto`, `full`, `fill` (shares a row with its siblings)                        |

- Write every class literally inside a recipe: Tailwind reads the source, so a
  class assembled at runtime is never generated.
- A new visual state is a new variant, never a ternary of class strings at the
  call site.
- `className` is for placement (margins, widths, grid positions), not for
  restyling a component. If a call site needs a different look, the component
  needs a variant.
- Features import components from `@/design/components/<name>` or the
  framework's `/ui`; a Guffin wrapper wins when one exists (section 1.3).

### 5.5 Where a style lives

- **Global** (`src/app/globals.css`): the reset and the imports of the design
  system. Nothing else.
- **System** (`src/design/styles`): tokens, themes, the glass material, the
  interaction contract, and vocabulary used by several features (`cine-*`,
  `ui-*`, `plan`, `lift`).
- **Component** (`*.module.css` beside it): keyframes, masks, pseudo-elements
  and cross-element selectors that only one component uses. Wrap rules in the
  layer the original sat in (`@layer components` or `utilities`) so utilities
  passed by a caller still win; reach page scopes with
  `:global([data-cinematic])`.
- **Inline** (Tailwind in the recipe or the element): everything else.

### 5.6 Module themes

The framework's modules (dock, modal, context menu, toast, controls rail,
error screen, ambient) render unstyled slots; `src/design/theme/<module>.ts`
fills them with `defineTheme(moduleTheme, { slots, styles, motion })`, and
`src/design/theme.ts` hands the list to `ThemeProvider`.

- **`slots`** are class strings built from foundations (`SHELL`, `FLOAT`,
  `TIP`, `WELL`, `TONES`, `TOOLTIP`, `SKELETON`), never raw values.
- **`styles`** carry what classes cannot: `zIndex` from `Z_INDEX`, padding
  the framework measures.
- **`motion`** is the module's choreography (`dock-motion.ts`, `modal.ts`, `context-menu.ts`, `notification.ts`), on the shared vocabulary of `theme/motion.ts`.
- State reaches the slots as data attributes (`data-placement`,
  `data-shelf`, `data-anchored`, `data-ghost`, `data-active`), styled with
  `data-[…]:` variants in the slot string.

| Module       | File                                           | Notes                                                                                                                                                                    |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dock         | `dock.ts`, `dock-motion.ts`, `styles/dock.css` | Width 520px, card padding 12px, cards `rounded-shell` glass; shelf card 96px, `rounded-[22.5px]`, holds a 45px bar; header icon 48px; commands 36px clear with `ui-iris` |
| Modal        | `modal.ts`                                     | `SHELL` frame, `BACKDROP` veil, `DIM` under the top one; positions center/top/right/bottom/left                                                                          |
| Context menu | `context-menu.ts`                              | `SHELL` at `rounded-sheet`, 8px padding, items 40px `rounded-card`, `TONE.label` eyebrow                                                                                 |
| Toast        | `notification.ts`                              | A 40px `SHELL` pill, `type-meta`, max 380px, docked 6px under the dock                                                                                                   |
| Controls     | `controls.ts`                                  | The side rail for page controls (lg and up)                                                                                                                              |
| Error        | `error.ts`                                     | The crash screen; retry is `ui.parts.button.root({ intent: "primary" })`                                                                                                 |

The dock's command row is shared through `src/design/dock-commands.ts`: a
command can take the whole row over for a moment (the theme picker); every
other command steps out while it holds it.
