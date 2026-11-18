# 2. Principles

- **The picture leads.** Guffin is a projection room: chrome recedes so the
  film's own image can carry the page. One palette, read from the picture by
  the framework's ambient for a light ground, gives the page colour (its
  mood), the accent (the grade: its most vivid colour) and the room's light
  (pale glows of its regions).
- **Quiet, on paper.** There is one theme: paper (the picture's mood at
  L 0.955) with near-black ink. Liquid glass reads best on it: light, depth
  and frost show on white. Components name roles and `themes.css` gives each
  role its one value. Surfaces are white sheets with ink hairlines; layers
  lift on a shadow cut from the page's own hue. There is no dark mode, no
  theme switch and no `data-theme`: never add a second value for a role.
  Text over a picture is the only exception (`.on-photo`, 03-colour).
- **One material for what floats.** The dock, modals, menus, tooltips, toasts
  and controls over a picture are all liquid glass: a thin tint, refraction at
  the bezel, frost behind. Never glass on glass: a
  control inside glass is a fill (a well).
- **Light, not weight.** Hierarchy comes from ink steps and type, never from
  heavy shadows or borders. Surfaces are fills and 1px rings; layers are
  glass and lift on a shadow cut from the page's own hue.
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
