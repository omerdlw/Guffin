# 6. Motion: engine, time and matter

Guffin has one motion engine, `src/motion/`. Every page, dock surface,
scroll and CSS duration answers to it, so the interface moves like one
material. The engine standardises _laws_, not movements: a page writes a score
(who is on stage, what each part is made of, in what order they arrive) and the
engine supplies the time, the shape and the physics. `docs/motion-engine.md` is
the full reference; this section is the contract.

```ts
const movie = defineScore({
  tempo: 0,
  cast: {
    backdrop: { matter: "plate", depth: 1 },
    title: "ink",
    facts: "light",
    poster: { matter: "paper", enter: "door" },
    review: "paper",
  },
  opening: ["backdrop", "title", "facts", "poster"],
  sections: { reviews: ["review"] },
});
```

A score never contains a duration, a distance, an easing or a delay. If a page
seems to need one, the page is missing a matter, a verb or a rung (section 6.9).

### 6.1 Time: one ladder, one tempo

Every duration is a rung of the ladder in section 3.7. A page chooses only its
**tempo** (-3 to +3): how many rungs to slide the whole ladder. Because the
ladder is geometric, tempo scales every duration by the same factor.

| Surface                             | Tempo | Why                                                 |
| ----------------------------------- | ----- | --------------------------------------------------- |
| Legal pages                         | -1    | Reading, not a scene                                |
| Film, person, home, account, salons | 0     | The default pace                                    |
| Dock surfaces                       | -3    | A tool in the hand, three rungs quicker than a page |

In CSS, `StageRoot` and `SurfaceRoot` set `data-tempo` and `--tempo` on their
own root, and the `--step-*` tokens are declared on `:root,[data-tempo]` so they
resolve there. A duration written in a stylesheet keeps the time of the page it
is on.

### 6.2 Matter: weight, not seconds

A part says what it is made of. The matter fixes its rung, mass, damping, curve
and its entering and leaving verbs.

| Matter  | Rung | Arrives | Enters    | Leaves | For                      |
| ------- | ---- | ------- | --------- | ------ | ------------------------ |
| `light` | 2    | 1.31 s  | `glow`    | `fade` | Labels, facts, figures   |
| `glass` | 2    | 1.31 s  | `clear`   | `fog`  | Panels, buttons, notes   |
| `ink`   | 3    | 2.12 s  | `rise`    | `fade` | Titles, text             |
| `paper` | 3    | 2.12 s  | `lift`    | `sink` | Cards, posters, rows     |
| `metal` | 4    | 3.43 s  | `settle`  | `sink` | A heavy object           |
| `plate` | 4    | 3.43 s  | `develop` | `cool` | A backdrop, a photograph |

Prose enters with `read` (word by word, a wave of light blur and a few pixels
of travel); a staircase step enters with `descend` (from above and a little
behind). Nothing is a block: text is split into words or letters, a heading
into lamp, letters, rule and actions, a sidebar into its rows.

Display type enters with `focus` (`{ matter: "ink", enter: "focus" }`): out of
a blur of `haze(5)`, a little larger and a little low, into its edge. Nothing
arrives in less than a second and a quarter.

- **Leaving** takes two rungs less than arriving and never more than `step(2)`.
  A page lets go faster than it arrived.
- **A hand** (pointer, drag, keyboard) is answered three rungs quicker than the
  part arrived, by a spring of the same matter.
- An entering verb may be overridden per part (`enter: "door"`, `"wipe"`,
  `"still"`). Verbs are shapes (progress to look) and contain no time. Light
  reaches full strength by φ⁻¹ of the way, so a part reads before it settles.
