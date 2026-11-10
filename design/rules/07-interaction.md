# 4. Interaction contract

### 4.1 The two beats

Every control answers in the same two beats:

- **In:** hover or focus arrives over `reveal` on `cream`.
- **Out:** it fades over `settle` on `phosphor`, like light decaying.
- **Press:** down in `touch`, back in `move`. Press scale is `0.96`, or `0.98`
  for links and full-width controls.

`tempo-quick` quickens the beats inside a dock surface (it sits on the dock's
`surfaceBody`): in over `light`, out over `leave`. A 5% step stretched across
`reveal` / `settle` moves one colour level at a time and reads as stepping,
hence the quicker pair there.

**A theme swap is one cut.** `setThemeChoice` (`src/lib/theme.ts`) puts
`data-theme-switching` on `<html>` for the swap and the frame after it, and
`interaction.css` turns every transition off while it stands. Without it each
control would crossfade to the new palette over `settle` on its own clock.

Springs (`SPRING` in `src/motion/time.ts`) are the engine's own, turned
into stiffness and damping by `springForce`: `press` is the engine's press on
_light_, one rung quicker than its hover, for a control going down and back;
`follow` is _ink_ answering a hand, for a highlight sliding after the pointer or
the choice (`SlidingHighlight`, the segmented control's pill). A spring written
anywhere else is built the same way, from `springForce(response(MATTER.x, n))`
(the print's `Tilt`, the glyph's `Magnet`), never from a stiffness typed by
hand. A stagger between marks steps by `ripple` (a rating's stars) or `flick`
(siblings).

### 4.2 States

| State    | Treatment                                                                               |
| -------- | --------------------------------------------------------------------------------------- |
| Rest     | Text `ink-body` (never dimmer for a control); surface `fill`, ring `edge`               |
| Hover    | Text `ink`; surface `fill-hover`, ring `edge-hover`                                     |
| Focus    | The hover treatment via `focus-visible` (ring at `edge-focus`), plus the global outline |
| Active   | The press beat and scale                                                                |
| Chosen   | `TONE.chosen`: `bg-grade/15 ring-grade/25`, hover `20 / 30`; text in grade              |
| Disabled | `STATE.disabled`: `opacity-50`, no pointer, no press                                    |
| Busy     | `STATE.busy`: keeps its colour, wait cursor, the loader over the label                  |
| Submit   | `<Button intent="primary">`. Grade marks a chosen state, never a submit                 |

Each row is one tone in `src/design/foundations/tones.ts` (`TONES.neutral`,
`chosen`, `primary`, `danger`, `armed`, `glass`, `ghost`): a complete answer
to rest, hover, focus-visible and active, written against roles only.

**Hover and focus arrive together.** Every `hover:` that changes colour has a
`focus-visible:` twin that does the same; on a field it is `focus:`. Under a
`group`, a `group-hover:` colour or opacity has two twins:
`group-focus-visible:` for when the group itself takes focus and
`group-has-focus-visible:` for when something inside it does. Movement
(`translate`, `scale`) has no twin.

**Inside one hover target** (`group`: a row, card or tile) the title rises to
`ink` and its secondary parts (an icon, a meta line) take one step,
`ink-muted` to `ink-body`, through `group-hover`. Nothing else steps by one.

**Focus outline** comes from `src/design/styles/interaction.css`: 1.5px in
`--focus-ring` (45% ink in dark, 55% in light: 4:1 or better against the page,
as WCAG 1.4.11 asks), or `--focus-ring-grade` on film and person pages (70%
grade in dark; in light the grade is as light as the paper, so the ink ring
stays). Components do not set their own. What a component may
add is the state's own step: `focus-visible:ring-edge-focus` on a button or
tab, `focus:bg-fill-hover focus:ring-edge-focus` on a field. Fields are
`<Input>` (or `inputVariants()`), never a copy of it.

### 4.3 Links and text decoration

Two forms, both with `underline-offset-2`. The text of a link never dims on
hover.

| Form                | Where                          | Classes                                                                                 |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Always underlined   | A link inside running text     | Decoration (or border) `ink-faint`, `ink-muted` on hover and focus                      |
| Underlined on point | A name or title that is a link | `underline decoration-transparent hover:decoration-current` + the `focus-visible:` twin |

`hover:underline` is not used.

### 4.4 An open layer holds the page

**While a select is open, the page behind it does not scroll.** The wheel or a
touch drag over the list moves the list, and at the end of the list it stops
there; it never carries on to the page. Every floating layer that owns a
scroller of its own does the same, through one hook:

```tsx
useScrollLock(isOpen); // "@/design/hooks/use-scroll-lock"
```

`<Select>` already calls it, so a select needs nothing from the page. The hold
is counted (two layers may hold it; the page is released when the last lets
go), is published as `data-scroll-lock` on `<html>`, and changes no `overflow`,
so the scrollbar stays and nothing shifts. The scroll engine (6.6) stands down
while the attribute is there. The layer's own scroller carries
`overflow-y-auto overscroll-contain`. A new kind of floating list is not drawn
by hand: use `<Select>`, or call the hook.

### 4.5 Helper classes

| Class        | Effect                                                            |
| ------------ | ----------------------------------------------------------------- |
| `ui-iris`    | A fill blooms behind the control on hover and focus               |
| `ui-fade`    | Transitions opacity along with colour                             |
| `ui-glyph`   | An icon that scales to 1.08 with its control                      |
| `ui-still`   | Opts a control out of the press scale                             |
| `ui-sheen`   | The sheen sweep on `PRIMARY`                                      |
| `cine-press` | Lift and press, for standalone surface buttons                    |
| `cine-fade`  | Colour fade on hover and focus, for icon buttons inside a toolbar |
