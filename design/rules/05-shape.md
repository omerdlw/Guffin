# 3.4–3.6 Foundations: radius, geometry and depth

### 3.4 Radius

Corners sit on the 4px grid and are named by what they round.

| Token           | px  | For                                        |
| --------------- | --- | ------------------------------------------ |
| `rounded-thumb` | 8   | Thumbnails, logos, small posters           |
| `rounded-tile`  | 12  | List rows                                  |
| `rounded-card`  | 16  | Cards, carousels, menus' options, tooltips |
| `rounded-panel` | 20  | Person cards, menus                        |
| `rounded-sheet` | 24  | The poster, modals                         |
| `rounded-full`  | —   | Buttons, pills, tabs, avatars              |
| `rounded-mark`  | 3   | A data mark: chart bar, calendar cell      |

Tailwind's radii and arbitrary ones are off; `rounded-none` and
`rounded-[inherit]` remain.

Two more are _derived_, not chosen: `rounded-inset` (10) is a card less the 6px
padding of a surface tile, for a tile inside one; `rounded-shell` (26) is a
card plus the 10px gutter of the dock and modal shells.

**Nested frames keep their curves parallel.** The inner radius is the outer one
minus the padding between them: `nested(outer, padding)`. A card of 20 with
`p-1` holds a photo of 16; a surface tile of 16 with `p-1.5` holds 10. Props
that take a number (`MediaCard`, `Tile`) and inline styles read `RADIUS`.

**A carousel's ends wear its cards' corners.** The track clips its picture
band to the radius of the first card's frame, so a card scrolled half out is
cut along a curve equal to its own, never a square edge. Captions under the
frames are left square.

### 3.5 Geometry

Every interactive block sits on one height ladder, so controls placed side by
side (dock actions, a field and its button, a row of chips) share a baseline
and a centre line. A rung fixes the whole box: height, inline padding, the gap
between glyph and label, the glyph size and the type step travel together.

| Size     | Class              | px  | Padding | Gap | Glyph | Type      | For                              |
| -------- | ------------------ | --- | ------- | --- | ----- | --------- | -------------------------------- |
| `xs`     | `h-control-xs`     | 24  | 10      | 4   | 12    | `label`   | Badges, inline chips             |
| `sm`     | `h-control-sm`     | 32  | 14      | 6   | 14    | `meta`    | Compact toolbars, media controls |
| `chrome` | `h-control-chrome` | 36  | 16      | 8   | 16    | `control` | Dock and modal chrome            |
| `md`     | `h-control-md`     | 40  | 16      | 8   | 16    | `control` | The default; the dock action     |
| `lg`     | `h-control-lg`     | 48  | 20      | 10  | 18    | `body`    | Hero actions, touch-first rows   |

A square control is `size-control-*` (`<Button icon>`). A height off
the ladder (`h-7`, `h-9`, `h-11`) on a control is a bug; on an avatar, a
picture or a mark it is not a control and is free.

### 3.6 Depth

There are no shadows. Tailwind's shadows and arbitrary ones are switched off,
and no layer, control, picture or mark casts one. A layer is told from the page
by its glass, its ring and its blur alone.
