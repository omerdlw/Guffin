# 6. Motion

Motion was reset to zero. The site is static until a page writes its own
choreography; nothing animates by default and there is no shared clock,
ladder, tempo or easing set. No `transition-*`, `duration-*`, `ease-*`,
`animate-*` class or CSS timing token exists any more.

### 6.1 The contract

- **Components name their roles, pages own the motion.** A component marks
  what it is with a role (`<Part name="poster">`, `<Section cue="lists">`,
  `usePart("avatar")`). A page declares its roles in its own `motion.tsx` with
  `defineStage({ parts, sections })`. Until that page gives a role its
  choreography, the role renders still.
- **Times live where they are used.** A page's choreography writes its own
  durations, curves and springs. There is no global rhythm to inherit.
- **Reduced motion is the only global rule.**

### 6.2 Modules

The dock, modal, context menu and toast (and every surface or HUD the dock
opens) get their own choreography, separate from the pages, and are done last.
Until then their themes in `src/design/theme/` use `INSTANT`
(`src/design/theme/motion.ts`): they open and close in one cut.

### 6.3 Kept as they were

These pieces are isolated from the reset and keep their own time:

- The cursor and reticle (`src/motion/cursor.tsx`, `reticle.css`, `ticker.module.css`)
- WebGL: the backdrop projection (`projection.tsx`, `gl-projection.ts`, `gl.ts`)
  and the top-100 / oscars / directors scenes (`scene.ts`)
- The detail hero marquee (`marquee.tsx`) and the idle `Intermission` (`screen.tsx`)
- Tilt, magnet and foil (`tilt.tsx`)
- The smooth-scroll driver (`scroll.ts`)
- Colour from the picture (`src/design/grade.ts`) and the room's atmosphere
  (`src/design/components/room.tsx`)

Curves for these pieces come from `bezier()` in `src/motion/curve.ts`.
