# 4. Interaction contract

### 4.1 Response

Controls answer hover, focus and press with a change of state (colour, fill,
ring); there is no colour transition until a page or module choreographs one
(section 6).

**Glass controls also answer with touch.** Every `.liquid-touch` element
(each `Button`, a select's trigger, a field) is driven by
`src/design/liquid-touch.ts`:

| Touch | Answer                                                                               |
| ----- | ------------------------------------------------------------------------------------ |
| Hover | A mouse leans it ≤ 2px towards the pointer; the cursor's glass wraps it              |
| Press | It gives about 4px towards the point pressed, and comes back with one soft wobble    |
| Key   | Space and Enter press it from the centre                                             |
| Field | One soft swell as it takes focus, nothing else: text being read or typed never moves |

There is no light of its own that follows the pointer: the cursor marks
the pointer, wrapped round the control's shape (section 6.9). Reduced
motion drops the movement; a disabled control does not answer; nothing in
the dock takes part but its action buttons (below). A new control that should feel like glass carries
`liquid-touch` (and `liquid-control` for the material, section 10.4); it
never runs its own pointer loop. A field takes `liquid-touch-field`.

**Thumbs turn to glass.** The segmented control's indicator and the
switch's knob (`glass-thumb.ts`) are solid at rest. Pressed, dragged or
crossing to a new choice, they swell into clear liquid glass that bends
what lies under them at the rim (the labels, the track and its fill) and
settle solid again. The glass is sized, never scaled, so its lens stays
laid out for the box it bends; the bend is kept gentle so letters at the
rim stay letters.

**Dock actions move like the dock.** The buttons under a dock card
(`action` slot, `dock-action`) press like every other button, and what
they show moves the way the dock moves words (`action-content.tsx`):

| Change         | Answer                                                                             |
| -------------- | ---------------------------------------------------------------------------------- |
| Label's words  | `ActionLabel`: the old label lifts 5px and fades, the new one rises 5px behind it  |
| Label's number | Only the digits that changed roll, the same way ("117" → "97": the units stay put) |
| Icon           | `ActionIcon`: the old glyph swells and fades, the new one settles in from 0.84     |
| Arrival        | It rises 13px from below and settles; side by side, left to right, 55ms apart      |

On a fresh page the arrival waits for the dock itself to land
(`ActionArrival`). A dock action's icon and label use `ActionIcon` and
`ActionLabel` (the label takes a string), never a bare `Icon` and span.

**A surface's contents move the same way.** Inside a dock surface
(`SurfaceStage`) blocks are `item`, list rows `row` (with `index`), empty and
error states `note`; a view that a tab, filter or state replaces sits in a
`SurfaceSwap` (`items`, or `rows` for a list). They rise from below as the
glass opens and lift away before what replaces them. Buttons, fields and row
links press as above but never lean: the glass clips its contents. A
surface button whose label or icon changes (Follow → Requested, the spoiler
switch, a list's lock) uses `ActionLabel` / `ActionIcon` too.

### 4.2 States

| State    | Treatment                                                                                    |
| -------- | -------------------------------------------------------------------------------------------- |
| Rest     | Text `ink-body` (never dimmer for a control); surface `fill`, ring `edge`                    |
| Hover    | Text `ink`; surface `fill-hover`, ring `edge-hover`                                          |
| Focus    | The hover treatment via `focus-visible` (ring at `edge-focus`), plus the global outline      |
| Active   | The active fill                                                                              |
| Chosen   | `TONE.chosen`: dark grade 15% fill, 25% ring, grade ink (hover 20 / 30); light a white sheet |
| Disabled | `STATE.disabled`: `opacity-50`, no pointer, no press                                         |
| Busy     | `STATE.busy`: keeps its colour, wait cursor, the loader over the label                       |
| Submit   | `<Button intent="primary">`. Grade marks a chosen state, never a submit                      |

Each row is one tone in `src/design/foundations/tones.ts` (`TONES.neutral`,
`outline`, `chosen`, `primary`, `danger`, `armed`, `glass`, `ghost`): a
complete answer to rest, hover and focus-visible, written against roles only.
`STATE.disabled` and `STATE.busy` are added by the recipe base.

| Tone      | Rest                                            | Hover / focus                              |
| --------- | ----------------------------------------------- | ------------------------------------------ |
| `neutral` | `fill`, `edge` ring, `ink-body`                 | `fill-hover`, `edge-hover`/`-focus`, `ink` |
| `outline` | clear, `edge-hover` ring, `ink-body`, `ui-iris` | `edge-focus`, `ink`, iris fill             |
| `chosen`  | `chosen`, `chosen-edge`, `chosen-ink`           | `chosen-hover`, `chosen-edge-hover`        |
| `primary` | `primary`, `on-primary`, `ui-sheen` (10%)       | `primary-hover`                            |
| `danger`  | `danger/15`, ring `danger/25`, `text-danger`    | `20 / 30`                                  |
| `armed`   | solid `danger`, `on-accent`                     | —                                          |
| `glass`   | the liquid lens, `ink`                          | `--liquid-tint-hover`                      |
| `ghost`   | clear, no ring, `ink-body`, `ui-iris`           | `ink`, iris fill                           |

**Hover and focus arrive together.** Every `hover:` that changes colour has a
`focus-visible:` twin that does the same; on a field it is `focus:`. Under a
`group`, a `group-hover:` colour or opacity has two twins:
`group-focus-visible:` for when the group itself takes focus and
`group-has-focus-visible:` for when something inside it does. Movement
(`translate`, `scale`) has no twin.

**Inside one hover target** (`group`: a row, card or tile) the title rises to
`ink` and its secondary parts (an icon, a meta line) take one step,
`ink-muted` to `ink-body`, through `group-hover`. Nothing else steps by one.

**Focus outline** comes from `src/design/styles/system/interaction.css`:
1.5px (`--focus-width`) in `--focus-ring` (45% ink in dark, 55% in light: 4:1
or better against the page, as WCAG 1.4.11 asks), 2px off the element
(`--focus-offset`), resting transparent 5px out so it closes in as it
appears. It applies inside `.ui-motion` and `.ui-scene`, and skips fields,
`contenteditable` and anything marked `data-own-focus`. On the page scopes
`.home-page`, `.movie-page`, `.person-page` and `.account-page` it takes
`--focus-ring-grade` (`styles/interaction.css`; 70% grade in dark; in light
the grade is as light as the paper, so the ink ring stays). Components do not set their own. What a component may
add is the state's own step: `focus-visible:ring-edge-focus` on a button or
tab, `focus:bg-fill-hover focus:ring-edge-focus` on a field. Fields are
`<Input>` (or `ui.parts.input.field()`), never a copy of it.

### 4.3 Links and text decoration

Two forms, both with `underline-offset-2`. The text of a link never dims on
hover.

| Form                | Where                          | Classes                                                                                 |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Always underlined   | A link inside running text     | Decoration (or border) `ink-faint`, `ink-muted` on hover and focus                      |
| Underlined on point | A name or title that is a link | `underline decoration-transparent hover:decoration-current` + the `focus-visible:` twin |

`hover:underline` is not used.

### 4.4 An open layer holds the page

**While a select is open, the page behind it does not scroll.** The wheel or a
touch drag over the list moves the list, and at the end of the list it stops
there; it never carries on to the page. Every floating layer that owns a
scroller of its own does the same, through one hook:

```tsx
import { useScrollLock } from "@omerdlw/base-framework/hooks";
useScrollLock(isOpen);
```

`<Select>` already calls it, so a select needs nothing from the page. The hold
is counted (two layers may hold it; the page is released when the last lets
go), is published as `data-scroll-lock` on `<html>`, and changes no `overflow`,
so the scrollbar stays and nothing shifts. The smooth-scroll driver (section 6.9) stands down
while the attribute is there. The layer's own scroller carries
`overflow-y-auto overscroll-contain`. A new kind of floating list is not drawn
by hand: use `<Select>`, or call the hook.

### 4.5 Helper classes

| Class                   | Effect                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-iris`               | A fill (`--iris`, default `fill-hover`) appears behind the control on hover and focus, `fill-active` on press; hidden on glass controls |
| `ui-sheen`              | Clipping and isolation for `PRIMARY`                                                                                                    |
| `ui-fade`               | A marker the dock's CSS gives an opacity transition                                                                                     |
| `ui-motion`, `ui-scene` | Scopes where the global focus outline applies (layers carry `ui-motion`; a page's `main` carries `ui-scene`)                            |
| `center`                | `flex items-center justify-center`                                                                                                      |
