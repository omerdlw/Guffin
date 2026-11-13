# 8–9. Common mistakes and checklist

## 8. Common mistakes

| Don't                                                             | Do                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `bg-white/[0.07]`, `text-[13px]`, `rounded-[14px]`                | `bg-fill-hover`, `type-control`, `rounded-card`             |
| `text-sm`, `text-gray-400`                                        | `type-body`, `text-ink-muted`                               |
| `shadow-lg`, `drop-shadow-*`                                      | Nothing: separate with glass, ring and blur                 |
| `hover:text-ink` alone                                            | `hover:text-ink focus-visible:text-ink`                     |
| `hover:underline`                                                 | `underline decoration-transparent hover:decoration-current` |
| A link that dims to `ink-body` on hover                           | Rest at `ink` or `ink-body`, rise to `ink`                  |
| A white chosen tab or a grade submit button                       | Chosen: `intent="chosen"`. Submit: `intent="primary"`       |
| `bg-white text-black`, `bg-black/70`                              | `bg-primary text-on-primary`, `bg-glass`                    |
| A light value derived from the dark one (`black/5` for `white/5`) | A role, valued per theme in `themes.css`                    |
| `${a} ${lit ? "x" : "y"}` class strings                           | A variant: `<Button intent={lit ? "chosen" : "neutral"}>`   |
| A component's keyframes in `globals.css`                          | A `*.module.css` beside the component                       |
| `h-9` / `h-11` on a control                                       | A rung of the ladder: `h-control-chrome`, `h-control-lg`    |
| A copied input style                                              | `<Input>`                                                   |
| `focus-visible:outline-*` on a component                          | Nothing: the outline is global                              |
| `opacity` or `transform` classes on a part                        | A wrapper element that owns the class                       |
| Your own `requestAnimationFrame` loop or smooth-scroll lib        | `mountScene` (`src/motion/scene.ts`) and `drive`            |
| `router.push` to leave a page                                     | `useDockActions().navigate`, which waits for the stage      |
| `text-ink-faint` on a date                                        | `text-ink-muted`                                            |
| A hover background on a row in a list                             | `HighlightGroup` / `useHighlight`                           |
| An open select or list whose wheel scrolls the page behind it     | `useScrollLock(isOpen)` (`<Select>` does it)                |

## 9. Checklist

Before finishing UI work:

- [ ] Every colour, size, radius and duration is a role from this document.
- [ ] Controls sit on the geometry ladder and are drawn by a recipe.
- [ ] Both themes were looked at; a role that looks wrong in one is retuned in
      `themes.css`, not patched at the call site.
- [ ] No arbitrary value for colour, type, radius, shadow or opacity.
- [ ] Every `hover:` has its `focus-visible:` twin (`group-` forms included).
- [ ] Controls rest at `ink-body` or brighter and rise to `ink`.
- [ ] Chosen uses grade; the submit action uses `PRIMARY`.
- [ ] Nested radii come from `nested()` or `rounded-inset`.
- [ ] Classes are merged with `@/design/foundations/cn`.
- [ ] Controls are design-system components with props, not class strings.
- [ ] Components only name roles; any motion is written in the page's `motion.tsx`.
- [ ] The page's `main` carries `ui-scene`; a surface uses `SurfaceStage`.
- [ ] Reduced motion was tried: the page still reads.
- [ ] With a select (or any floating list) open, the page does not scroll.
- [ ] `npm run typecheck`, `npm run lint` and `npm run format:check` pass.

Quick audits, each of which should print nothing:

```bash
# arbitrary opacity
grep -rnE '[a-z]+/\[[0-9.]+\]' src --include='*.ts' --include='*.tsx'
# shadows
grep -rnE '\b(shadow|drop-shadow|inset-shadow)-' src --include='*.ts' --include='*.tsx'
# Tailwind palette colours
grep -rnE '\b(text|bg|ring|border)-(gray|zinc|slate|neutral|stone|red|orange|amber|yellow|green|emerald|teal|sky|blue|indigo|violet|purple|pink|rose)-[0-9]' src
# Tailwind and arbitrary type sizes
grep -rnE '\btext-(xs|sm|lg|xl|[2-9]xl|\[[0-9])' src/features src/design src/motion src/app
# Tailwind radii, tracking and weights
grep -rnE '\brounded(-[trbl]{1,2})?-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b|tracking-(tighter|tight|normal|wide|wider|widest)|font-(thin|extralight|light|normal|extrabold|black)\b' src
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
# an animation loop of your own (layout followers and retries are the exceptions)
grep -rn 'requestAnimationFrame' src --include='*.ts' --include='*.tsx' | grep -vE '^src/motion/|theme/command\.tsx|settings/shared\.tsx|spotlights/shell\.tsx'
```
