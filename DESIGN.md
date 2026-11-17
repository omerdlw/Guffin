# Guffin Design System

Guffin is a film and TV diary with a cinematic interface on one theme:
paper. This file is the map; the contract itself lives in
[`design/rules/`](design/rules), split by topic. It is written for
contributors and for AI agents that generate or review UI here: follow it
literally, and when it is silent, extend the system (add a role, a variant, a
token) instead of working around it.

Every value in these files is read from the code. When the code and a rule
disagree, the code is the truth and the rule is a bug: fix the rule in the
same change.

## The one idea

**Every visual value has a role, and every role has one value.** A
colour is not "white at 6%", it is `fill`. A radius is not "14px", it is
`card`. A page does not say "rise 24px over 0.8s"; it names its title as a
part and its own `motion.tsx` says how that part moves. Components name roles,
never raw values, so changing the system is changing one line.

## How a look is built

Each layer only reads from the layers above it.

```
1. Tokens (CSS)           src/design/styles/system/tokens.css, styles/tokens.css
   @theme: type-*, radius-*, spacing-control-*, spacing-fib-*, tracking-*;
   Tailwind's palette, sizes, radii, shadows and easings switched off.
        ↓ every colour token points at a CSS variable
2. Themes (CSS)           src/design/styles/themes.css
   :root gives every variable its one value: ink steps, fills, edges,
   chosen, glass (--liquid-*), primary, semantic, room atmosphere, all
   derived from the paper colour, which follows the picture
   (--ambient-shadow). .on-photo re-values them for text over a picture.
        ↓
3. Foundations (TS)       src/design/foundations/
   tones.ts  TONES, STATE, FILL, WELL, LAYER, TONE: complete state answers
   layers.ts SHELL, FLOAT, TIP, BACKDROP, DIM, GLASS: the chrome
   geometry.ts RADIUS + nested(); layout.ts page grid and headlines;
   z-index.ts Z_INDEX; variants.ts CVA merged through cn
        ↓
4. Recipes + ui (TS)      src/design/recipes.ts → src/design/ui.ts
   PARTS: the look of every framework component part (button, input,
   switch, checkbox, segmented, select, carousel, tooltip, loader,
   skeleton, image, avatar, highlight). defineUi() registers them, teaches
   cn the custom token families and sets the framework's icons and motion.
        ↓
5. Components             @omerdlw/base-framework/ui (unstyled, drawn by PARTS)
                          src/design/components/ (Guffin's own and wrappers)
        ↓
6. Module themes          src/design/theme/*.ts (dock, modal, context menu,
                          toast, controls, error, ambient): framework slots
                          filled from foundations
        ↓
7. Material + touch       liquid.css + glass/ (engine), liquid-touch.ts,
                          glass-thumb.ts, the cursor (src/motion/cursor.tsx)
        ↓
8. Page choreography      src/features/<page>/motion.tsx → defineStage()
                          compiled to one scoped stylesheet (src/motion/choreo.ts)
```

The framework (`@omerdlw/base-framework`) ships behaviour and no design: no
CSS, colours, durations, z-indexes or icon names. Anything visual is Guffin's
and lives in `src/design`.

## The files

Section numbers are stable across files, so "section 3.4" always points at the
same text.

| File                                                              | Sections   | Read it when                                                          |
| ----------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| [01-working.md](design/rules/01-working.md)                       | 1          | Always first: where things live, which component, workflow, ten rules |
| [02-principles.md](design/rules/02-principles.md)                 | 2          | You need the why behind a choice                                      |
| [03-colour.md](design/rules/03-colour.md)                         | 3.1, 3.2   | Any colour or opacity; the grade; the paper and `.on-photo` values     |
| [04-type.md](design/rules/04-type.md)                             | 3.3        | Any text: scale, faces, weights, headlines, labels                    |
| [05-shape.md](design/rules/05-shape.md)                           | 3.4 to 3.8 | Radius, control ladder, spacing, page layout, depth, stacking         |
| [06-motion.md](design/rules/06-motion.md)                         | 6          | Anything that moves: the stage API, triggers, φ timing, modules       |
| [07-interaction.md](design/rules/07-interaction.md)               | 4          | Hover, focus, press, touch, links, scroll lock                        |
| [08-components.md](design/rules/08-components.md)                 | 5          | Picking a component, layers, surfaces, variant API, module themes     |
| [09-glass.md](design/rules/09-glass.md)                           | 10         | The liquid glass material: classes, tokens, lens engine, thumbs       |
| [13-exceptions.md](design/rules/13-exceptions.md)                 | 7          | The few places the rules bend                                         |
| [14-mistakes-checklist.md](design/rules/14-mistakes-checklist.md) | 8, 9       | Before finishing: mistakes, checklist, grep audits                    |

## Quick reference

| Need                  | Use                                                                    |
| --------------------- | ---------------------------------------------------------------------- |
| Text colour           | `text-ink` · `-lead` · `-body` · `-muted` · `-faint`                   |
| A surface at rest     | `bg-fill ring-1 ring-edge ring-inset` or `FILL` / `TONES.neutral`      |
| Chosen                | `TONE.chosen` / `intent="chosen"` (a white sheet; grade over a picture) |
| The one submit action | `<Button intent="primary">`                                            |
| Floating chrome       | `SHELL` (layer), `FLOAT` (dock control), `TIP` (tooltip): liquid glass |
| A control in the dock | `WELL` + `WELL_HOVER`: a fill, never glass on glass                    |
| Type                  | `type-micro` … `type-heading`, `type-display-*`, `headlineClass()`     |
| Radius                | `rounded-mark/thumb/inset/tile/card/panel/sheet/shell/full`            |
| Control height        | `h-control-xs/sm/chrome/md/lg` (24/32/36/40/48)                        |
| Stacking              | `Z_INDEX` from `@/design/foundations/z-index`                          |
| Merge classes         | `cn` from `@/design/ui`                                                |
| Motion                | The page's `motion.tsx` (`defineStage`); components only name roles    |
