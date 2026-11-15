# 2. Principles

- **The picture leads.** Guffin is a projection room: chrome recedes so the
  film's own image can carry the page. The page colour follows the picture
  (the ambient shadow), the accent is taken from it (the grade), and the room
  around it (wash, vignette, grain) is lit in its hues.
- **Quiet, in two themes.** Dark is near-black with off-white ink; light is
  paper (the picture's hue at L 0.95) with near-black ink. The theme is
  `data-theme` on `<html>` (Settings → Appearance: System, Light, Dark;
  `src/features/theme/store.ts`, applied before paint by
  `features/theme/script.ts`). **Each theme is art-directed on its own**:
  components name roles, `themes.css` gives each role a value per theme, and
  neither is computed by inverting the other. Dark surfaces are light
  breathed onto the page; light surfaces are white sheets with ink hairlines.
- **One material for what floats.** The dock, modals, menus, tooltips, toasts
  and controls over a picture are all liquid glass: a thin tint, a glint on
  the rim, refraction at the bezel, frost behind. Never glass on glass: a
  control inside glass is a fill (a well).
- **Light, not weight.** Hierarchy comes from ink steps and type, never from
  heavy shadows or borders. Surfaces are fills and 1px rings; layers are
  glass; on paper they also lift on a shadow cut from the page's own hue.
- **One answer to a touch.** Every control answers the same way: its state
  steps up on hover and focus together; glass controls give under a press and
  come back with one soft wobble. Consistency is the polish.
- **One scale.** 5% opacity steps, a 4px corner grid, a control height ladder,
  and the golden ratio for time and rhythm (φⁿ seconds, Fibonacci staggers
  and travel).
- **Each page its own rhythm.** Motion is written per page, not inherited from
  a shared tempo. Components name their parts; the page decides how they move
  (section 6).
- **Visible quality over measured speed.** Performance work must not change
  what is seen: animation timing, scroll feel and image sharpness are part of
  the design.
