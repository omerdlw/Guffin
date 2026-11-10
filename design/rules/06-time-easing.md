# 3.7 Foundations: time and easing

All time is one geometric ladder, `step(n) = 0.5s × φⁿ`. In TypeScript it is
`step(n)` from `@/motion/utils`; in CSS it is `--step-n6 … --step-6` (and the
`duration-*` utilities below). A stage multiplies the whole ladder by `φ^tempo`
(section 6.1), so the ratio between two durations never changes.

| Role     | n   | ms   | CSS                           | For                                   |
| -------- | --- | ---- | ----------------------------- | ------------------------------------- |
| `ripple` | -6  | 30   | `--step-n6`                   | A stagger across many marks (a dial)  |
| `step`   | -5  | 45   | `--step-n5`                   | Rows of a menu stepping in            |
| `flick`  | -4  | 75   | `--step-n4`, `duration-flick` | Staggers between siblings             |
| `touch`  | -3  | 120  | `--step-n3`, `duration-touch` | A press going down; a tooltip closing |
| `leave`  | -2  | 190  | `--step-n2`, `duration-leave` | Something closing                     |
| `light`  | -1  | 310  | `--step-n1`, `duration-light` | A small light coming up (tooltip)     |
| `reveal` | 0   | 500  | `--step-0`, `duration-reveal` | A hover or focus arriving             |
| `move`   | 1   | 810  | `--step-1`, `duration-move`   | A press coming back; a turn           |
| `settle` | 2   | 1310 | `--step-2`, `duration-settle` | A hover fading out; an image arriving |
| `linger` | 3   | 2120 | `--step-3`, `duration-linger` | Afterglow, zoom, shimmer              |

Distances are on the same ladder: `reach(n) = 24px × φⁿ`. Blur and brightness
are powers of φ. The default transition is `leave` on `out-quart`.

| CSS (`ease-*`) | Engine curve (`POINTS`) | Job                                     |
| -------------- | ----------------------- | --------------------------------------- |
| `out-cream`    | -                       | A hover or focus arriving               |
| `phosphor`     | -                       | Light decaying after the pointer leaves |
| `out-expo`     | `expo`                  | Chrome and readouts snapping in         |
| `out-quint`    | `silk`                  | Names and lines settling                |
| `fade`         | `fade`                  | Plain opacity                           |
| `in-out-cubic` | `glide`                 | Loops, sweeps, scrubs                   |
| `out-quart`    | -                       | The default for anything unnamed        |
| `in-cubic`     | -                       | Leaving                                 |

Every curve starts gently and keeps moving to the end. As the share of its time
a curve has used when it reaches 50% / 90% of the way: `fade` 35 / 63, `silk`
34 / 61, `pour` 31 / 59, `expo` 27 / 58, `fall` 50 / 77; and of the CSS-only
curves `phosphor` 31 / 64, `cream` 28 / 60, `quart` 26 / 58. (The curves these
replaced reached 90% after a third of their time, which is why a 1.3 s arrival
looked finished in half a second.) New curves are measured the same way: no
curve may reach 90% before half of its time.

The engine also owns `pour`, `dolly` and `fall`, reached as `--curve-<name>` in
CSS. The CSS names that have an engine curve are aliases of its `--curve-*`
variable, so there is one definition of each. In motion's API, pass a curve as
`[...POINTS.expo]` and a duration as `step(n)`; never a number of seconds.

#### Focus

Blur is a rung like time: `haze(n) = φⁿ` px, in CSS `--haze-n1 … --haze-6`
(0.6 px … 17.9 px). It is a force of the same standing as opacity, scale and
travel, and the engine caps what one part may carry at once (`HAZE_CAP`,
`haze(6)`).

- Entering and leaving verbs carry it: opacity lands first, then scale and blur
  finish with the movement, so the last thing seen is the part coming into
  focus.
- A press softens the control by `haze(-1)` and lets it back into focus.
  Nothing at rest is blurred: pointing at a card in a carousel never puts its
  neighbours out of focus.
- **Glass never carries a filter.** A filter on an element takes the backdrop
  away from every `backdrop-filter` below it, so layers (`SHELL`, `FLOAT`, the
  dock card) animate by opacity and scale; what is written inside them (text,
  icons, rows) comes out of the soft.
- Reduced motion removes blur with the rest of the movement.

Transitions are off by default (`src/design/styles/interaction.css`) and exist inside `.ui-motion`,
`.ui-scene` and `[data-cinematic]`; a component that animates lives inside one.
A page's `main` carries `ui-scene` so its controls answer; a dock surface gets
it from `SurfaceStage`.
