# 3.3 Foundations: type

### Faces

| Face  | Variable                      | Loaded in                                   | For                                                        |
| ----- | ----------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Geist | `--font-geist` → `font-sans`  | `next/font/google` in `src/app/layout.tsx`  | The interface; variable, so weights are exact              |
| Zuume | `--font-zuume` → `font-zuume` | `next/font/local` (`zuume-bold.woff2`, 700) | The headline ladder and big figures, always uppercase bold |

`--font-*` is reset in the system tokens; only these two exist.

### Scale

Sizes are `type-*` utilities (`styles/system/utilities.css`), never `text-*`.
Tailwind's sizes (`text-sm` …) and arbitrary ones (`text-[13px]`) are off.
Each step carries its own line height and tracking.

| Utility            | px / line                   | Tracking          | Figures | For                                          |
| ------------------ | --------------------------- | ----------------- | ------- | -------------------------------------------- |
| `type-micro`       | 10 / 12                     | +0.02em           | tabular | Calendar digits, badges, captions under 11   |
| `type-label`       | 11 / 16                     | +0.01em           | tabular | Small caps labels (`TONE.label`), fine print |
| `type-meta`        | 12 / 16                     | +0.008em          | tabular | Dates, counts, descriptions, tooltips        |
| `type-control`     | 13 / 16                     | +0.004em          | tabular | Buttons, chips, compact rows                 |
| `type-body`        | 14 / 20                     | 0                 |         | The default UI text                          |
| `type-copy`        | 15 / 24                     | −0.002em          |         | Card titles and excerpts; dock titles        |
| `type-base`        | 16 / 24                     | −0.004em          |         | Larger titles                                |
| `type-prose`       | 16 / 26, 17 / 28 from 40rem | −0.002 / −0.003em |         | Long-form reading (`PROSE_TYPE`)             |
| `type-title`       | 18 / 28                     | −0.008em          |         | Section, list and dialog titles              |
| `type-heading`     | 24 / 32                     | −0.014em          |         | Page headings and figures inside a layer     |
| `type-display-xs`  | 36 / 1                      | 0                 |         | The Zuume ladder, big figures                |
| `type-display-sm`  | 48 / 1                      |                   |         |                                              |
| `type-display-md`  | 60 / 1                      |                   |         |                                              |
| `type-display-lg`  | 72 / 1                      |                   |         |                                              |
| `type-display-xl`  | 96 / 1                      |                   |         |                                              |
| `type-display-2xl` | 128 / 1                     |                   |         |                                              |

A `leading-*` or `tracking-*` class beside a `type-*` wins over the step's
own (the utilities read `--tw-leading` / `--tw-tracking` first). `cn` knows
the `type-*` family, so a later step replaces an earlier one.

### Line height

A step's own; `leading-none` for a single line set tight; `leading-3` to
`leading-9` (the 4px grid) for a paragraph. `leading-crop` (0.8) sets a Zuume
figure on its caps. `tight`, `snug`, `relaxed` and arbitrary line heights are
off.

### Tracking

Optical, and it lives in the step: small sizes open up, body sits at 0,
larger sizes close in, the display ladder sits at 0. Never add tracking by
hand except the three roles:

| Token              | Value  | For                   |
| ------------------ | ------ | --------------------- |
| `tracking-label`   | 0.14em | Small caps labels     |
| `tracking-tagline` | 0.12em | A tagline set larger  |
| `tracking-slate`   | 0.32em | The intermission card |

### Weight

`font-medium`, `font-semibold`, `font-bold`, and `font-normal` only to return
to the body weight inside a heavier line (a year after a title); nothing else.
its own value: dark ink on paper reads thinner than its nominal weight, so
every weight runs a step heavier.

| Weight            | Paper (`themes.css`) | `.on-photo` |
| ----------------- | -------------------: | ----------: |
| normal (the body) |                  420 |         400 |
| `font-medium`     |                  520 |         500 |
| `font-semibold`   |                  620 |         600 |

Light ink over a picture reads at its nominal weight, so `.on-photo` resets
them.

### Headlines

Page headlines are Zuume, uppercase, bold, sized by the length of the text so
a long title steps down instead of wrapping into a wall
(`src/design/foundations/layout.ts`):

```ts
headlineClass(title, TITLE_LIMITS); // movie: [26, 37, 49]; person: [20, 30, 42]
// ≤ 26 chars: display-lg → sm:display-xl → lg:display-2xl
// ≤ 37:       display-md → display-lg → display-xl
// ≤ 49:       display-sm → display-md → display-lg
// longer:     display-xs → display-sm → display-md
```

- `HEADLINE_BOX` pulls the caps onto the grid (Zuume's ascent sits high: a
  −0.14em top shift rounded to whole pixels, and matching margins).
- `HEADLINE_TYPE` is the face and the largest step, for skeletons.
- `marqueeClass(text, [short, …])` is the detail hero's marquee: a short name
  is set at 96 → 128 → 168px; past `short` characters it falls back to
  `headlineClass`. It is the one place a size sits off the ladder (section 7).

### Labels and small actions

- **`TONE.label`**: `type-label font-semibold tracking-label uppercase`.
  Every small caps label uses it. A label set at `type-micro` (a badge, the
  reticle) adds `tracking-label` itself. Centred ones pull back their last
  letter's tracking with `-mr-(--tracking-label)`.
- **`TONE.link`** (label-sized actions: "More", "Read more"): the label,
  `ink-muted` rising to `ink`.
- **Prose**: `PROSE_CLASS` = `max-w-[62ch] text-left type-prose text-pretty`.
