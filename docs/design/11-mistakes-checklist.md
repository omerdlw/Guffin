# 8–9. Common mistakes and checklist

## 8. Common mistakes

| Don't                                                                   | Do                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `bg-white/[0.07]`, `text-[13px]`, `rounded-[14px]`                      | `bg-fill-hover`, `type-control`, `rounded-card`                                       |
| `text-sm`, `text-gray-400`                                              | `type-body`, `text-ink-muted`                                                         |
| `shadow-lg`, `drop-shadow-*`                                            | Nothing: separate with glass, ring and frost                                          |
| `bg-glass backdrop-blur-*` on floating chrome                           | `SHELL` / `FLOAT` / `TIP` (liquid glass)                                              |
| A glass control inside the dock                                         | `WELL` + `WELL_HOVER`: never glass on glass                                           |
| A new lens, mask or refraction for a control                            | The liquid material (section 10)                                                      |
| `z-50`, `z-[999]`                                                       | `Z_INDEX` (`styles.zIndex` in a module theme)                                         |
| `cn` from the framework or `clsx` alone                                 | `cn` from `@/design/ui`                                                               |
| A `transition-*` / `duration-*` class on a component                    | A role in the page's `motion.tsx`                                                     |
| An animated `blur`                                                      | Opacity, translate, scale: no blur in motion                                          |
| `focus-visible:*`, `group-focus-visible:*`, `:focus-visible` in CSS     | Nothing: Guffin has no keyboard focus state; `hover:` alone                           |
| `hover:underline`                                                       | `underline decoration-transparent hover:decoration-current`                           |
| A link that dims to `ink-body` on hover                                 | Rest at `ink` or `ink-body`, rise to `ink`                                            |
| A white chosen tab or a grade submit button                             | Chosen: `intent="chosen"`. Submit: `intent="primary"`                                 |
| `bg-white text-black`, `bg-black/70`                                    | `bg-primary text-on-primary`, `bg-glass`                                              |
| A second theme, a `data-theme` branch or a `prefers-color-scheme` query | One role, one value in `themes.css` (`.on-photo` is the only exception)               |
| `${a} ${on ? "x" : "y"}` class strings                                  | A variant: `<Button intent={on ? "chosen" : "neutral"}>`                              |
| A component's keyframes in `globals.css`                                | A `*.module.css` beside the component                                                 |
| `h-9` / `h-11` on a control                                             | A rung of the ladder: `h-control-chrome`, `h-control-lg`                              |
| A copied input style                                                    | `<Input>`                                                                             |
| `tabIndex`, a skip link, a focus ring or outline                        | Nothing: Tab is blocked globally (`components/no-tab.tsx`), outlines are off          |
| `opacity` or `transform` classes on a part                              | A wrapper element that owns the class                                                 |
| Your own `requestAnimationFrame` loop or smooth-scroll lib              | `mountScene` (`src/motion/core/scene.ts`), the engine, or `drive` (`glass/spring.ts`) |
| `router.push` to leave a page                                           | `useDockActions().navigate`, which waits for the stage                                |
| `text-ink-faint` on a date                                              | `text-ink-muted`                                                                      |
| A hover background on a row in a list                                   | `HighlightGroup` / `useHighlight`                                                     |
| An open select or list whose wheel scrolls the page behind it           | `useScrollLock(isOpen)` from `/hooks` (`<Select>` does it)                            |

## 9. Checklist

Before finishing UI work:

- [ ] Every colour, size, radius and duration is a role from this document.
- [ ] Controls sit on the geometry ladder and are drawn by a recipe.
- [ ] Looked at on paper and over a picture; a role that looks wrong is
      retuned in `themes.css`, not patched at the call site.
- [ ] No arbitrary value for colour, type, radius, shadow or opacity.
- [ ] No `focus-visible` anywhere (classes, CSS, choreography); Tab stays blocked.
- [ ] Controls rest at `ink-body` or brighter and rise to `ink`.
- [ ] Chosen uses `TONE.chosen`; the submit action uses `intent="primary"`.
- [ ] Floating chrome is liquid glass; nothing inside the dock is glass.
- [ ] Nested radii come from `nested()` or `rounded-inset`.
- [ ] Classes are merged with `cn` from `@/design/ui`.
- [ ] Controls are design-system components with props, not class strings.
- [ ] Components only name roles; any motion is written in the page's `motion.tsx`.
- [ ] The page's `main` carries `ui-scene`; a surface uses `SurfaceStage`.
- [ ] Reduced motion was tried: the page still reads.
- [ ] Every page sharing a changed stage, surface or the dock was checked, in every role.
- [ ] With a select (or any floating list) open, the page does not scroll.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` and `npm run format:check` pass.

Quick audits, each of which should print nothing:

```bash
# arbitrary opacity
grep -rnE '[a-z]+/\[[0-9.]+\]' src --include='*.ts' --include='*.tsx'
# shadows
grep -rnE '\b(shadow|drop-shadow|inset-shadow)-' src --include='*.ts' --include='*.tsx' | grep -v 'shadow-(--'
# Tailwind palette colours
grep -rnE '\b(text|bg|ring|border)-(gray|zinc|slate|neutral|stone|red|orange|amber|yellow|green|emerald|teal|sky|blue|indigo|violet|purple|pink|rose)-[0-9]' src
# Tailwind and arbitrary type sizes
grep -rnE '\btext-(xs|sm|lg|xl|[2-9]xl|\[[0-9])' src/features src/design src/motion src/app | grep -v MARQUEE_SIZE
# Tailwind radii, tracking and weights
grep -rnE '\brounded(-[trbl]{1,2})?-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b|tracking-(tighter|tight|normal|wide|wider|widest)|font-(thin|extralight|light|extrabold|black)\b' src
# raw white and black (roles only)
grep -rnE '\b(bg|text|ring|border|from|to|via)-(white|black)\b' src --include='*.ts' --include='*.tsx'
# the old underline form
grep -rn 'hover:underline' src --include='*.ts' --include='*.tsx'
# retired motion systems
grep -rnE 'SmoothScroll|data-lenis|from "lenis' src --include='*.ts' --include='*.tsx'
# the animation library imported outside the engine (use @/motion/lib; ESLint enforces it too)
grep -rnE 'from "(motion(/react)?|framer-motion)"' src --include='*.ts' --include='*.tsx' | grep -v '^src/motion/'
# arbitrary transition and animation classes
grep -rnE '\[(transition|animation)[:-]' src --include='*.ts' --include='*.tsx'
# an animation loop of your own (layout followers are the exception)
# (allowed: the engine, glass thumbs, the carousel glide, the select's centring, theme and settings layout followers)
grep -rn 'requestAnimationFrame' src --include='*.ts' --include='*.tsx' | grep -vE '^src/motion/|^src/design/(liquid|liquid-touch)|glass-thumb|components/(carousel|select)\.tsx|theme/store\.ts|settings/panel\.tsx'
```
