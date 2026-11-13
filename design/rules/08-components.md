# 5. Components and recipes

### 5.1 Pick the component

| You need                                  | Use                                                              |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Any button                                | `<Button intent size shape icon width>`                          |
| A link drawn as a button                  | `<LinkButton intent size shape dock>`                            |
| A link: a card, a row, running text       | `<Link variant>`, `<DockLink variant>`, `<ExternalLink variant>` |
| A text action (Read more, Show it anyway) | `<TextButton variant>` (`inline`, `reveal`, `label`, `quiet`)    |
| A picture                                 | `<Image layout fit wrapperClassName>`; never a bare `<img>`      |
| A toggle on a detail page                 | `<ActionButton>`                                                 |
| The button that shows the rest of a list  | `<Button intent="neutral" shape="pill" width="full">`            |
| A text field                              | `<Input size shape>`, `<Textarea>`                               |
| A choice that applies at once             | `<Switch>`                                                       |
| A row that is checked                     | `<CheckboxIndicator>` inside the row; `<Checkbox>` alone         |
| A select                                  | `<Select size shape>`                                            |
| Tabs that switch a view                   | `<SegmentedControl size shape width>`                            |
| A picture that is a target                | `<MediaCard aspect framed>` in a `<Carousel>`                    |
| A label on hover                          | `<Tooltip>`                                                      |
| A row or tile inside a surface            | `rowVariants({ intent })`, `tileVariants()` and the anatomy      |
| Floating chrome over a picture            | `TONE.glass`; carousel arrows `TONE.arrows`                      |
| A small caps label                        | `TONE.label`                                                     |
| Dividers between rows                     | `TONE.rule`, `TONE.rules`                                        |
| Long-form reading                         | `PROSE_CLASS` (`PROSE_TYPE`)                                     |
| A page headline                           | `headlineClass()`, `HEADLINE_*`                                  |

### 5.2 Layers

The dock, modals, the context menu, toasts and tooltips are cut from one set of
chrome in `src/design/foundations/layers.ts`.

| Name       | Look                                                | For                                |
| ---------- | --------------------------------------------------- | ---------------------------------- |
| `SHELL`    | `glass`, `ring-edge-hover`                          | Dock card, modal, context menu     |
| `FLOAT`    | The same glass, blurred                             | Dock controls, breadcrumbs, toasts |
| `TIP`      | The same glass with `ring-edge` and `ink-lead` text | Tooltips (and `TOOLTIP.content`)   |
| `BACKDROP` | `veil`, `blur-md`                                   | What dims the page behind a layer  |
| `DIM`      | `dim`, `blur-xs`                                    | A layer left under the top one     |
| `FILL`     | `fill` / `edge`, one step up on hover               | A control inside a layer           |
| `PRIMARY`  | `primary`, `on-primary` ink, a 10% sheen            | The one action a layer exists for  |

Each is a call of `layerVariants({ kind })` or a tone in `foundations/tones.ts`.

Shells hold content on the card scale: a shell is `rounded-shell` (26), or
`rounded-sheet` (24) for the menu, and what sits inside is `rounded-card`. A
select's list is a menu: `SHELL` with `backdrop-blur-xl`.

**Layer motion.** Layers open and close in one cut until the modules get their own choreography (section 6.2).

### 5.3 Inside a surface

`components/surface` holds the stage a dock surface plays in (`SurfaceStage`,
`SurfacePart`, `DockAction`), the row and tile recipes (`rowVariants`,
`tileVariants`) and the tile's anatomy (`SURFACE_TEXT`, `SURFACE_TITLE`,
`SURFACE_META`, `SURFACE_TILE_INNER` …).

- **Tiles and rows carry no ring.** A tile is `bg-fill`; only a chosen one takes
  the grade ring. Rings stay on fields and buttons.
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
  action that cannot be undone (Unfollow) arms on the first press, as
  `intent="armed"` reading "Confirm", and runs on the second
  (`useConfirmStep`).
- **A long list is searchable.** From `SURFACE_SEARCH_MIN` (30) rows a list in a
  surface opens with `<SurfaceSearch>` above it, driven by `useSurfaceSearch`
  (case, accent and dotless-i insensitive; every word must match). A shorter
  list shows no field.
- **An icon button inside a tile** is bare (36px, no fill, no ring) and takes
  `bg-fill-hover` on hover.
- **A chosen button or row** uses the same grade steps as `TONE.chosen`.

### 5.4 The variant API

Every component is driven by props, and its look lives in a `variants.ts`
beside it, written with CVA through `variants()` (`foundations/variants.ts`),
which merges with `cn`: a caller's class replaces the recipe's class of the
same family instead of both landing in the DOM.

```tsx
<Button intent="primary">Save</Button>
<Button intent="ghost" icon shape="pill" size="sm" aria-label="Close">…</Button>
<Select options={…} value={v} onChange={setV} size="sm" shape="pill" />
<SegmentedControl items={…} value={tab} onChange={setTab} size="md" width="fill" />
<Link className={buttonVariants({ width: "full" })} href="/">Home</Link>
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
- A component's folder is its boundary: features import from
  `@/design/components/<name>`, never from a file inside it.

### 5.5 Where a style lives

- **Global** (`src/app/globals.css`): the reset and the import of the design
  system. Nothing else.
- **System** (`src/design/styles`): tokens, palettes, the interaction
  contract, and vocabulary used by several features (`cine-*`, `ui-sheen`).
- **Component** (`*.module.css` beside it): keyframes, masks, pseudo-elements
  and cross-element selectors that only one component uses. Wrap rules in the
  layer the original sat in (`@layer components` or `utilities`) so utilities
  passed by a caller still win; reach page scopes with
  `:global([data-cinematic])`.
- **Inline** (Tailwind in the recipe or the element): everything else.
