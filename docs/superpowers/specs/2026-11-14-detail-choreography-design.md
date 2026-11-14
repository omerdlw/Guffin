# Detail choreography (movie / TV) — short design

## Intent
The favourite page. Home was a title sequence; the detail page is the film's
one-sheet coming alive — everything turns toward the film itself. Cinematic,
premium, fluid. Fixes come after a first pass ("başlayalım, sonra düzeltiriz").

## Approach
One sensible way: write the choreography into the shared `DETAIL` stage
(`src/features/detail/motion.tsx`) on home's golden-ratio system (beat(n)=φⁿ s,
Fibonacci staggers/px, blur ≤ 13). CSS-compiled, no framer-motion — pages own
motion, components only name roles. A separate stage per page was rejected:
movie, TV, reviews, season and person already share one root and role set.

## Choreography
- Opening (load/ready): backdrop develops from dark; title resolves letter by
  letter from the centre; rule draws left→right; stats arrive in turn; tagline
  word by word; overview like a subtitle; actions and sidebar last, fact rows
  label → line → value.
- Below (view): cast folders dealt centre-out; gallery/recommendation slides
  dealt from the right, arrows after; review stars light in order; award and
  wall tiles in a wave; episode rows cascade.
- Swaps (Deck tabs, cast/crew, gallery tabs): old view leaves left + defocus,
  new one enters from the right.
- Scroll: existing JS backdrop defocus stays; the header block lifts and fades.
  Wheel feel as home.
- Touch: lift on cards, slow push into images, firm press on buttons.

## Cast card — the folder
Inspired by `folders-ui/project-folder`. Three layers:
- Back panel (grade-tinted), holding five cards: portrait in the centre, two
  known-for posters each side, darker/softer/rotated with distance.
- Frosted front panel covering the cards' feet: name + character/job only
  (no footer row).
- Hover/focus opens it: back panel tips back 15° from its foot, cards stay
  upright, spread and rise, clear and brighten, centre first; front panel tips
  forward 25°.
- Needs two compiler additions in `src/motion/choreo.ts`: X-axis rotation and
  perspective on a role.

## Scope / non-goals
Movie, TV, reviews and season sub-pages share it; person inherits shared roles
(its own pieces later). Marquee, WebGL projection, Intermission untouched.
Modules (dock, modal, …) stay instant. Visual verification deferred until asked.
