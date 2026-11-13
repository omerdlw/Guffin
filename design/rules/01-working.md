# 1. Working with this system

### 1.1 The one idea

**Every visual value has a role, and every role has one value.** A colour is
not "white at 6%"; it is `fill`. A radius is not "14px"; it is `card`. A
duration is not "400ms"; it is a rung of the ladder. A page does not say "rise
24px over 0.8s"; it says its title is _ink_. Components name roles, never raw
values, so changing the system means changing one line.

### 1.2 Where things live

```
src/design/
  styles/        the system's CSS: tokens, themes, interaction, cinematic, utilities
    system/        tokens, palette, time, interaction, effects, utilities
  foundations/   what components are built from, no React
    variants.ts    CVA, merged through cn
    tones.ts       TONES (one per intent), STATE (disabled, busy), TONE, FILL
    layers.ts      layerVariants and SHELL, FLOAT, TIP, BACKDROP, DIM, GLASS
    geometry.ts    the control ladder (CONTROL), RADIUS, nested()
    layout.ts      page containers, columns, headline and prose measures
    z-index.ts     Z_INDEX, the only stacking values
  ui.ts          cn (class merging that knows every token family) and ui
  recipes.ts     shared component recipes (PARTS)
  theme.ts       the framework themes, one file per module in theme/
  surface-definition.ts  defineSurface typed by its props
  lazy-surface.ts        surfaces that load on first intent
  components/    one file per component, with its own *.module.css when needed
    <name>.tsx     the component, its recipes and its hooks (useConfirm in confirm.tsx)
```

| Component           | Exports                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `button`            | `Button`, `ActionButton`, `buttonVariants`                                               |
| `input`             | `Input`, `Textarea`, `inputVariants`                                                     |
| `checkbox`          | `Checkbox`, `CheckboxIndicator`, `checkboxVariants`                                      |
| `switch`            | `Switch`, `switchVariants`                                                               |
| `select`            | `Select`, `selectTriggerVariants`, `selectMenuVariants`, `selectOptionVariants`          |
| `segmented-control` | `SegmentedControl`, `SurfaceSegmentedControl`, `segmentedControlVariants`                |
| `tooltip`           | `Tooltip`, `TOOLTIP` (its parts, for a surface drawn without it)                         |
| `media-card`        | `MediaCard`, `mediaCardVariants`, `mediaFrameVariants`                                   |
| `carousel`          | `Carousel`, `carouselArrowVariants`                                                      |
| `image`, `avatar`   | `Image` (`layout` fill/intrinsic, `fit` cover/contain); `Avatar`                         |
| `icon`, `logo`      | `Icon`; `Logo`                                                                           |
| `backdrop`          | `BACKDROP_HERO`, `BACKDROP_HERO_MASK`, `BackdropHeroSkeleton`                            |
| `link`              | `Link`, `DockLink`, `ExternalLink`, `LinkButton`, `TextButton`, `FactLink` (`variant`)   |
| `loader`            | `Loader`, `Spinner`                                                                      |
| `skeleton`          | `SkeletonBlock`, `SkeletonLines`, `SKELETON` and page skeletons                          |
| `surface`           | `SurfaceStage`, `SurfacePart`, `DockAction`, `rowVariants`, `tileVariants`, tile anatomy |
| `highlight-group`   | `HighlightGroup`, `useHighlight` (one shared hover for a list)                           |
| `indicator`         | `SlidingHighlight`, `SlidingPill` (fills that follow the choice)                         |
| `route-error`       | `RouteError`                                                                             |

Outside `src/design`:

| What                                      | Where                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| The document reset and nothing else       | `src/app/globals.css`                                                             |
| A feature's own CSS                       | Beside it, as `*.module.css` (e.g. `src/features/home/logged.module.css`)         |
| Page choreography (roles)                 | `src/features/*/motion.tsx`                                                       |
| Motion reference                          | `src/motion/` and section 6 (`06-motion.md`)                                      |
| Framework slots: dock, modal, menu, toast | `src/design/theme/<module>.ts` (built from `foundations/` and component variants) |

### 1.3 Workflow for any UI change

1. **Look for an existing recipe** in the table in section 5 before writing
   classes. Most surfaces are one `TONE.*`, one surface-kit export or one
   `src/design` component or recipe.
2. **Compose from roles.** Use the tokens in section 3 and the state rules in
   section 4.
3. **If a value you need has no role, add one** (token in `@theme`, mirror in
   TypeScript if it has one, a row in this document). Never reach for an
   arbitrary value.
4. **Merge classes with `cn`** from `@/design/foundations/cn`, not the framework's. It knows
   every token family, so a later `type-meta` replaces `type-body` and
   `rounded-full` replaces `rounded-card`. The framework's `cn` reads these as
   unknown and keeps both.
5. **Run the checklist** in section 9 before calling the work done.

### 1.4 The ten rules

1. Colour comes from roles. Tailwind's palette is off.
2. Opacity moves in steps of 5%. No `/[0.07]`.
3. Type is `type-*`, never `text-*` (`text-*` is ink only).
4. Radius is a named token. Frames nested inside frames use `nested()`.
5. There are no shadows. Depth is glass, ring and blur.
6. Hover and focus are one event: every `hover:` has a `focus-visible:` twin.
7. A control rests at `ink-body` or brighter and rises to `ink` when pointed at
   or focused.
8. Raw white is the primary action and nothing else; a chosen control is never
   white.
9. Motion belongs to the page that renders it; components only name their
   roles (section 6).
10. Components do not draw their own focus outline.
