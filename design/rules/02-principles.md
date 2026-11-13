# 2. Principles

- **Quiet, in two themes.** Dark is near-black with off-white ink; light is
  paper (the ambient `shadow` lifted to L 0.95, so a pale tint of the picture's
  own hue) with near-black ink. Chrome recedes so the picture can lead. The
  theme is `data-theme` on `<html>` (Settings → Appearance: System, Light,
  Dark; `src/features/theme/store.ts`). **Each theme is art-directed on its own.**
  Components name roles (`ink`, `fill`, `glass`, `primary`); each theme gives
  every role its own value in `src/design/styles/themes.css`, and neither is
  computed by turning the other over. Dark surfaces are light breathed onto
  the page; light layers are frosted white sheets with crisp edges. Text that
  sits on a photograph takes `on-photo`, which keeps the dark palette inside
  that element in light.
- **The picture sets the colour.** On film and person pages the accent is the
  _grade_, a colour taken from the artwork. Without a picture it falls back to
  white. Nothing else introduces an accent.
- **Light, not weight.** Surfaces are 5% fills and 1px rings. Layers are glass.
  Hierarchy comes from ink steps and type, never from shadows or borders.
- **One answer to a touch.** Every control reacts in the same two beats: light
  arriving fast, decaying slowly. Consistency is the polish.
- **One scale.** 5% opacity steps, a 4px corner grid, a golden-ratio time scale.
- **Each page its own rhythm.** Motion is written per page, not inherited from
  a shared tempo (section 6).
