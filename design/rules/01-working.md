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
  styles/        the system's CSS: tokens, palettes, interaction, cinematic, effects
  foundations/   what components are built from, no React
    cn.ts          class merging that knows every token family
    variants.ts    CVA, merged through cn
    tones.ts       TONES (one per intent), STATE (disabled, busy), TONE, FILL
    layers.ts      layerVariants and SHELL, FLOAT, TIP, BACKDROP, DIM, GLASS
    geometry.ts    the control ladder (CONTROL), RADIUS, nested()
    layout.ts      page containers, columns, headline and prose measures
  hooks/         use-dock-link-click, use-confirm, use-scroll-lock
  components/    one folder per component
    <name>/
      index.ts            the public API: import from "@/design/components/<name>"
      <name>.tsx          the component
      variants.ts         its CVA recipes, when it has variants
      <name>.module.css   its own CSS, when it needs any
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

| What                                      | Where                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| The document reset and nothing else       | `src/app/globals.css`                                                                   |
| A feature's own CSS                       | Beside it, as `*.module.css` (e.g. `src/features/home/hero.module.css`)                 |
| Time, curves, springs (the ladder)        | `src/motion/utils.ts` (`step`), `constants.ts` (`POINTS`), `time.ts` (`SPRING`, matter) |
| The ladder as CSS (`--step-*`, `--curve`) | `src/motion/color.ts`, written to `:root` by the engine                                 |
| Page choreography (scores)                | `src/features/*/motion.tsx`                                                             |
| Motion reference (laws, kit)              | `src/motion/` and sections 6 to 6.10 (`09`–`12`, `15`)                                  |
| Framework slots: dock, modal, menu, toast | `src/design/theme/<module>.ts` (built from `foundations/` and component variants)                   |

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
9. Time comes from the ladder in section 3.7; a page names what a part is made
   of and never how long it takes (section 6).
10. Components do not draw their own focus outline.
