# 3.3 Foundations: type

Sizes are `type-*` utilities, never `text-*`. The Tailwind sizes (`text-sm`,
`text-xs` …) and arbitrary ones (`text-[13px]`) are switched off. Each step
carries its own line height. Faces: Geist for the interface, Zuume for the
headline ladder and big figures.

| Utility          | px / line                   | For                                          |
| ---------------- | --------------------------- | -------------------------------------------- |
| `type-micro`     | 10 / 12                     | Calendar digits, badges, captions under 11   |
| `type-label`     | 11 / 16                     | Small caps labels (`TONE.label`), fine print |
| `type-meta`      | 12 / 16                     | Dates, counts, descriptions, tooltips        |
| `type-control`   | 13 / 16                     | Buttons, chips, compact rows                 |
| `type-body`      | 14 / 20                     | The default UI text                          |
| `type-copy`      | 15 / 24                     | Card titles and excerpts                     |
| `type-base`      | 16 / 24                     | Larger titles                                |
| `type-prose`     | 16 / 28 → 17 / 30 from `sm` | Long-form reading (`PROSE_TYPE`)             |
| `type-title`     | 18 / 28                     | Section, list and dialog titles              |
| `type-heading`   | 24 / 32                     | Page headings and figures inside a layer     |
| `type-display-*` | 36, 48, 60, 72, 96, 128 / 1 | The Zuume headline ladder, big figures       |

- **Line height:** a step's own; `leading-none` for a single line set tight;
  `leading-3` to `leading-9` (the 4px grid) for a paragraph. `leading-crop`
  (0.8) sets a Zuume figure on its caps. `tight`, `snug`, `relaxed` and
  arbitrary line heights are off.
- **Tracking:** text sits at 0. Only three roles track: `tracking-label`
  (0.14em, small caps labels), `tracking-tagline` (0.12em, set larger) and
  `tracking-slate` (0.32em, the intermission card).
- **Weight:** `font-medium`, `font-semibold`, `font-bold`; nothing else.
- **Labels:** `TONE.label` is `type-label`, semibold, `tracking-label`,
  uppercase. Every small caps label uses it. A label set at `type-micro` (a
  badge, the reticle) adds `tracking-label` itself. Centred ones pull back with
  `-mr-(--tracking-label)`.
- **Label-sized actions** ("More", "Read more", "In the timeline"): `TONE.link`,
  `ink-muted` rising to `ink`.
