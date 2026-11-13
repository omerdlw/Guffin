# 6.8–6.9 Motion: the kit and extending the engine

### 6.8 The kit and the recipes

Build with the kit in `src/motion/kit.tsx` (bound to the page's score by
`bindScore`) before writing anything of your own.

| Need                                                       | Use                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| A page, and its parts and sections                         | `StageRoot`, `Part` / `usePart`, `Section`                     |
| A headline or text that arrives by words or letters        | `Text` (`by="word"` `"char"` `"line"` `"block"`)               |
| A section heading (lamp, name, rule, actions)              | `Header` cast as `{ matter: "ink", enter: "still" }`           |
| A printed line of text that exposes and burns away         | `Expose` (`hover` replays the band)                            |
| A film's or person's name: lit from the left, then focused | `Bloom` cast as `{ matter: "ink", enter: "still" }`            |
| A page that opens on its title, picture cut into the name  | `Marquee` cast as `{ matter: "plate", enter: "still" }`        |
| A number that counts up                                    | `Count`                                                        |
| Content that changes in place (filter, tab, page)          | `Swap`                                                         |
| Views kept alive while hidden                              | `Deck` (with `cue`, or as columns of sections)                 |
| A gallery wall hung in front of the page                   | `WallStage`, `useWall`                                         |
| The light of the room                                      | `Room`                                                         |
| A canvas or WebGL scene                                    | `useScene` / `mountScene`: frames come from the engine's clock |
| A poster with tilt and glare                               | `ArtworkPrint part`                                            |
| A carousel                                                 | `Carousel part="…"`, each slide a part                         |
| An action button that belongs to the stage                 | `ActionButton` with the page's `Part`                          |
| A dock surface (fields, rows, loaders, empty states)       | `SurfaceStage`, `SurfacePart`, `SurfaceSwap`                   |
| A canvas that is not a scene                               | Do not. Mount it as a `useScene` part                          |

Rules of use:

- **One door to the library.** Outside `src/motion`, `motion/react` is never
  imported directly: take `motion`, `animate`, `AnimatePresence`,
  `useReducedMotion` and the rest from `@/motion/lib` (ESLint
  `no-restricted-imports` enforces it).

- **Scopes nest.** `Swap`, `Deck` and `WallStage` open their own scope; a
  `Section` inside one joins it. What is done to a scope (`dismiss`, `recede`,
  `reset`) is done to everything under it.
- **Header sweeps.** A section's content enters with the header's light and
  only exposes, so a part below a `Header` takes `light` or `paper`, not a
  second movement.
- **Marks have their own verbs.** Bars and tiles enter with `door` (opening
  from their axis or base), a rule with `wipe`, a heading with `still`.
- **Surfaces** are tempo -2: a short rest while the dock opens, then fields and
  rows in DOM order. A loaded list, a category or a region is a `SurfaceSwap`;
  loading, empty and error states are a `note` (`glass`) in the rows' place.
  There are no directional entrances (`left`, `right`).
- **Export bound components one by one** from a client module
  (`export const PageStage = bound.StageRoot`); destructured exports are not
  visible to server components.
- **Salons and scenes** own their arrival (`enter: "still"`); the engine owns
  their leaving. Their renderers take `dt` from the engine and keep no
  `requestAnimationFrame` loop of their own.

### 6.9 Extending the engine

When the engine has no word for what you need, add the word; do not step around
it.

| Missing           | Add                                            | Where                   |
| ----------------- | ---------------------------------------------- | ----------------------- |
| A weight          | A matter                                       | `time.ts`               |
| A movement        | An entering or leaving verb (progress to look) | `time.ts`               |
| A curve           | A named cubic in `POINTS`                      | `time.ts` (CSS follows) |
| A force on a part | A field                                        | `forces.ts`             |
| A piece of chrome | A kit component, bound to the score            | `kit.tsx`               |
| A new page        | A score, in the feature's `motion.tsx`         | `features/<name>/`      |

Then document it here if it changes a contract; the detail lives in the
module itself under `src/motion/`.
