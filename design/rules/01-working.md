# 1. Working with this system

### 1.1 The one idea

**Every visual value has a role, and every role has one value.** A
colour is not "white at 6%"; it is `fill`. A radius is not "14px"; it is
`card`. A duration is not a shared token; it is written by the page or module
that moves. Components name roles, never raw values, so changing the system
means changing one line.

### 1.2 Where things live

```
src/app/globals.css        imports Tailwind, the system CSS, the theme CSS; the reset
src/app/layout.tsx         fonts (Geist → --font-geist, Zuume → --font-zuume), theme script
src/app/providers.tsx      mounts UiProvider(ui), themes, GlassEngine, LiquidTouch,
                           ActionArrival, Cursor, EngineProvider, the dock registry

src/design/
  styles/
    system/                the base layer (ex-framework CSS), loaded first
      tokens.css             @theme: type scale, radii, control heights; Tailwind
                             palette, sizes, radii, shadows, easings switched off;
                             every colour token mapped to a CSS variable
      utilities.css          center, type-* utilities, scrollbar-none
      interaction.css        the global focus outline (--focus-*)
      effects.css            ui-sheen, ui-skeleton(-soft), ui-dots/ui-dot
    tokens.css             Guffin's @theme additions: fonts, leading-crop,
                           tracking-*, grade/semantic colours, spacing-fib-*,
                           spacing-dock-shelf
    themes.css             THE values: paper (:root) and .on-photo,
                           liquid glass and room tokens, weights
    utilities.css          φ (--phi, --cut), plan/plan-main/plan-aside, lift
    liquid.css             the glass material (section 10)
    dock.css               the dock's arrival, fold, touch transitions
    modules.css            what module motion cannot reach (--modal-glass)
    interaction.css        ui-iris; grade focus ring on page scopes
    cinematic.css          [data-cinematic] selection, cine-afterglow
  foundations/             no React
    variants.ts              variants(): CVA merged through cn
    tones.ts                 TONES, STATE, FILL, WELL, WELL_HOVER, LAYER, TONE,
                             PRIMARY, INLINE_LINK
    layers.ts                SHELL, FLOAT, TIP, BACKDROP, DIM, GLASS
    geometry.ts              RADIUS, nested()
    layout.ts                page containers, columns, headline and prose classes
    z-index.ts               Z_INDEX, the only stacking values
  recipes.ts               PARTS: the look of every framework UI component
  ui.ts                    defineUi(): PARTS + cn vocabulary + icons + motion → ui, cn
  theme.ts                 the module themes, one file per module in theme/
  theme/                   dock.ts, dock-motion.ts, modal.ts, context-menu.ts,
                           notification.ts, controls.ts, error.ts, ambient.ts, motion.ts
  glass/                   the glass engine: optics, materials, maps (section 10)
  liquid-touch.ts          press and lean for .liquid-touch controls (section 4.1)
  grade.ts                 the colour taken from the picture (section 3.1)
  action-text.ts           how a dock action's label changes (words vs digits)
  dock-commands.ts         the dock's command row and its take-over
  surface-definition.ts    defineSurface typed by its props
  lazy-surface.ts          surfaces that load on first intent
  components/              Guffin's own components and framework wrappers

src/motion/                the motion engine (section 6)
src/features/<x>/motion.tsx  a page's choreography
```

### 1.3 Where a component comes from

Two sources. **The framework** (`@omerdlw/base-framework/ui`) ships unstyled
behaviour; Guffin draws every part through `PARTS` in `recipes.ts`. **Guffin**
(`@/design/components/<name>`) ships its own components and thin wrappers that
set Guffin's defaults. When a wrapper exists, import the wrapper.

| Component                                                                                                                            | Import from                               | Notes                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Button`                                                                                                                             | `@omerdlw/base-framework/ui`              | Drawn by `PARTS.button`; `intent size shape icon width loading`                                |
| `Input`                                                                                                                              | `@/design/components/input`               | Wrapper: `size="md"` by default                                                                |
| `Textarea`                                                                                                                           | `@omerdlw/base-framework/ui`              | `PARTS.input.area`                                                                             |
| `Checkbox`, `CheckboxIndicator`                                                                                                      | `@omerdlw/base-framework/ui`              | `PARTS.checkbox`                                                                               |
| `Switch`                                                                                                                             | `@/design/components/switch`              | Guffin's own: a knob that turns to glass                                                       |
| `SegmentedControl`                                                                                                                   | `@/design/components/segmented-control`   | Guffin's own: an indicator that turns to glass; `SurfaceSegmentedControl` for the dock's shelf |
| `Select`                                                                                                                             | `@/design/components/select`              | Wrapper: menu offset, opens centred on the chosen option                                       |
| `Tooltip`, `TOOLTIP`                                                                                                                 | `@/design/components/tooltip`             | Wrapper; `TOOLTIP` holds its classes for hand-drawn tips                                       |
| `Icon`                                                                                                                               | `@/design/components/icon`                | Wrapper: `center`, 20px; Iconify names, `solar:` set first                                     |
| `Carousel`                                                                                                                           | `@/design/components/carousel`            | Wrapper: arrows on the picture, pans with the stage's `glide`                                  |
| `Image`, `Avatar`                                                                                                                    | `@omerdlw/base-framework/ui`              | `Image layout fit`; never a bare `<img>`                                                       |
| `Loader`, `Spinner`                                                                                                                  | `@omerdlw/base-framework/ui`              | `PARTS.loader`                                                                                 |
| `HighlightGroup`, `useHighlight`                                                                                                     | `@omerdlw/base-framework/ui`              | One shared hover fill for a list                                                               |
| `SlidingPill`, `useSlidingPill`                                                                                                      | `@omerdlw/base-framework/ui`              | A fill that follows the choice (tab bars)                                                      |
| `SkeletonBlock`, `SkeletonLines`, `SKELETON`, `SectionHeaderSkeleton`, `TabsSkeleton`, `CarouselSkeleton`                            | `@/design/components/skeleton`            | Page skeleton helpers                                                                          |
| `Link`, `DockLink`, `ExternalLink`, `TextButton`, `FactLink`, `linkVariants`                                                         | `@/design/components/link`                | `variant`: `inline reveal hairline label quiet`                                                |
| `MediaCard`                                                                                                                          | `@/design/components/media-card`          | A picture that is a target; `aspect framed`; `data-kind="media"`                               |
| `ActionButton`                                                                                                                       | `@/design/components/action-button`       | A toggle on a detail page                                                                      |
| `ActionLabel`, `ActionIcon`, `ActionArrival`                                                                                         | `@/design/components/action-content`      | What a dock action shows, and how it changes                                                   |
| `SurfaceStage`, `SurfacePart`, `SurfaceSwap`, `SurfaceExtension`, `SurfaceAnchor`, `DockAction`, `SurfaceSearch`, `useSurfaceSearch` | `@/design/components/surface`             | Inside a dock surface (section 5.3)                                                            |
| `rowVariants`, `tileVariants`, `SURFACE_*`                                                                                           | `@/design/components/surface-classes`     | Rows, tiles and their anatomy                                                                  |
| `SurfaceProse`                                                                                                                       | `@/design/components/surface-prose`       | Long text inside a surface                                                                     |
| `useConfirm`, `useConfirmedAction`                                                                                                   | `@/design/components/confirm`             | A confirmation as a dock HUD                                                                   |
| `BACKDROP_HERO`, `BACKDROP_HERO_MASK`, `BackdropHeroSkeleton`                                                                        | `@/design/components/backdrop`            | The page's hero picture and its mask                                                           |
| `Room`, `useShowing`                                                                                                                 | `@/design/components/room`                | The room's atmosphere: wash, sheen, vignette, grain, house lights                              |
| `Logo`, `RouteError`                                                                                                                 | `@/design/components/logo`, `route-error` |                                                                                                |

| Elsewhere                                   | Where                                                                |
| ------------------------------------------- | -------------------------------------------------------------------- |
| The reset and the CSS imports, nothing else | `src/app/globals.css`                                                |
| A feature's own CSS                         | Beside it, as `*.module.css` (e.g. `features/movie/cast.module.css`) |
| Page choreography                           | `src/features/*/motion.tsx`                                          |
| Framework slots: dock, modal, menu, toast   | `src/design/theme/<module>.ts`                                       |

### 1.4 Workflow for any UI change

1. **Look for an existing component or recipe** (section 1.3, section 5.1)
   before writing classes. Most surfaces are one tone (`TONES.*`, `TONE.*`),
   one layer (`SHELL`, `FLOAT`, `TIP`) or one component with props.
2. **Compose from roles.** Tokens in section 3, states in section 4.
3. **If a value has no role, add one**: a variable in `themes.css` (both
   themes), its token in `tokens.css`, the TypeScript mirror if one exists
   (`RADIUS`, `Z_INDEX`), the `ui.ts` merge list if it is a new token family
   member, and a row in these rules. Never an arbitrary value.
4. **Merge classes with `cn` from `@/design/ui`.** It knows every custom
   family, so a later `type-meta` replaces `type-body` and `rounded-full`
   replaces `rounded-card`. A `cn` that does not know them keeps both.
5. **Movement goes in the page's `motion.tsx`**, never in the component.
6. **Look at it on paper and over a picture** and **run the checklist** (section 9).

### 1.5 The ten rules

1. Colour comes from roles. Tailwind's palette is off.
2. Opacity moves in steps of 5%. No `/[0.07]`.
3. Type is `type-*`, never `text-*` sizes (`text-*` is colour only).
4. Radius is a named token. Frames nested inside frames use `nested()`.
5. No shadows. Depth is glass, ring, `lit` and `lift`.
6. Hover and focus are one event: every `hover:` has a `focus-visible:` twin.
7. A control rests at `ink-body` or brighter and rises to `ink` when pointed
   at or focused.
8. `primary` (solid ink) is the submit action and nothing else; a chosen
   control is never primary.
9. Motion belongs to the page that renders it; components only name their
   roles (section 6).
10. Components do not draw their own focus outline.
