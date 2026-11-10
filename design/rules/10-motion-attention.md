# 6.3–6.5 Motion: attention, forces and touch

### 6.3 Attention: one queue

- One beat asks for attention at a time. The next beat starts **three rungs
  inside** the previous one (`CUE_LEAD`): when the eye finds it, not when the
  last one lands. Matters arrive one rung slower than they once did and the
  lead is one rung longer, so beats start when they always did and every part
  overlaps the one before it by more.
- Copies of one part follow each other by their `cadence`: rows and cards on a
  golden `trail` (each gap φ⁻¹ of the one before); words, letters and lines at
  an **even** gap, paced like speech, never bunched at the end; a column of
  rows or buttons on **stairs**: one step after another, top to bottom, the
  whole flight no longer than one arrival. A score may cast a cadence
  (`{ matter: "light", enter: "descend", cadence: "stairs" }`). However many
  there are, they fit in a window one rung below the part.
- **The opening is a fixed piece of time.** The curtain stays down until the
  opening's parts are ready (the picture, the fonts) or `PATIENCE` has run out;
  then the whole opening is laid on the clock at once, every beat at its own
  place on the score's timeline (`stage.timeline`), counted from the frame the
  curtain rose. What comes before the curtain is waiting; what comes after is
  always the same sequence at the same times. It does not depend on frame
  rate, scroll, a backlog, the order parts mounted in, or an earlier visit
  (there is no faster revisit). A part that mounts late takes its place on the
  timeline.
- A section scrolled into view joins the same queue, when its top edge reaches
  φ⁻¹ of the screen. Waiting cues shorten the gap by a rung, at most two
  (`HURRY_CAP`): a fast scroller never waits for an animation.
- A part in the cast that no beat calls plays with the last beat of the
  opening. Nothing stays in the dark.
- A part that must wait for its picture says `usePart(name, { ready: false })`;
  the curtain holds for it, no longer than `step(3)`.
- A section that is the direct continuation of the opening but lives in its own
  scope is `Section now` / `Swap now`. Dock surfaces use `now` throughout.

### 6.4 Forces: depth and drift

- **Depth.** A part with `depth: d` moves at φ^(-d/2) of the scroll, dims to
  φ^-d and blurs by d·φ px as it is passed. A backdrop is `depth: 1`. A page
  never says "scroll 240px over 900px"; it gives a depth.
- **Drift.** A part with `drift: k` leans toward the pointer by `reach(-2) · k`
  px, through its matter's response spring.
- **A part owns `opacity`, `transform`, `filter` and `clip-path`.** If the
  element needs a transform of its own (`-translate-x-1/2`), put the part on a
  wrapper. Never write those four properties on a part in a class or a style.

### 6.5 Touch: the same matter at the speed of a hand

Hover, focus and press enter a part as a **force** and are blended with the
fields. The verbs are `press` (shrinks by φ⁻⁷ and softens by `haze(-1)`), `lift` (rises `reach(-3)`) and
`glow` (brightens by φ⁻⁴). `:focus-visible` counts as hover and Enter as press.
A part takes `usePart(name, { touch: "lift" })`; a button that is not a part
takes `useTouch({ verb, matter })`, which writes only `transform` and `filter`.
This is the JavaScript half of the two beats in section 4.1; plain controls use
the CSS half.
