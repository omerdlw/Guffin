# 6.10 The passage: moving from one page to the next

A page transition is one object, the **passage** (`src/motion/passage.ts`,
drawn by `<Passage />` in `src/design/components/passage/`). It is a veil over
the screen with one value, `cover` (0: the page shows, 1: the page is hidden),
and four phases:

```text
clear ──close()──▶ closing ──▶ covered ──lift()──▶ lifting ──▶ clear
```

| Moment                                   | What happens                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A trip leaves (dock, `navigate()`, back) | `<Passage />` holds the trip: the veil rises while the stage leaves, and the route is not asked for until the screen is covered             |
| A plain link is pressed                  | No hold exists, so the click (capture phase) raises the veil; a click that goes nowhere lets it down after `step(2)`                        |
| The route loads                          | `Handoff` (a `loading.tsx` that came from another page) shows nothing of its own: the veil is the screen, with the departing page's palette |
| A page opens with a scene                | `Marquee` calls `keep()`: the veil stays until the stage releases                                                                           |
| The stage releases                       | `StageRoot` lifts the veil over `step(2)`, as the title dives and the backdrop develops: the page comes up through it                       |
| A route with no scene                    | `land()` gives it a grace of `step(1)`, so a skeleton is never hidden for long                                                              |
| The trip never lands                     | The veil lifts after `step(-3)`, unless a replacement trip has closed it again                                                              |

Laws:

- **No seconds.** Every duration is a rung (`PASSAGE_*_RUNG`); reduced motion
  gets the quiet rung. A page never writes a duration for its transition.
- **A page does not draw the veil.** It asks: `Marquee` keeps it, `Handoff`
  closes it, `StageRoot` lifts it. A feature that needs another behaviour adds
  a method to `Passage`, not a second veil.
- **The veil sits between the page and the marquee** (`PASSAGE_LAYER`), so the
  title can develop on it. The dock stays above it.
- **Never longer than `step(5)`.** A page that never releases cannot trap the screen.

## Leaving the marquee

The marquee's title leaves by diving through the camera. The dive runs on
`glide` (symmetric, so the zoom never lurches), its fade starts when the title
is already moving and ends as the dive ends, and the page's parts are arriving
under it for the whole time. A layer that cannot be seen (opacity under
`MARQUEE_UNSEEN`, a rim that has thinned away) is not drawn.

A part that fills much of the viewport (`BULK_SHARE`) is never blurred as it
moves: a blur on a backdrop costs a frame. It keeps its scale, brightness and
light.
