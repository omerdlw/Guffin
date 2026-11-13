# 7. Exceptions

These are tuned against the picture rather than the interface, and are the only
places the rules above bend:

- **The projection room's optics:** the sheen, the ambient wash, grain, the reticle, the film tube and the projector's camera and
  lens springs may sit below the 5% step and use raw white or black.
- **The idle screen's CRT** (switch-off collapse, beam) keeps its own curves and
  timings; it imitates a device, not the interface.
- **The kit's exposure light** (`Expose`, `Header`, `Bloom`, `Room`) is a warm white near
  `#fcfcfb` and may use raw rgb, because it is light on the picture.
- **A member's backdrop** washed behind a notification: 25, 40 on hover.
- **Pointer followers** (the reticle's cursor loop, `layout-flow`'s FLIP
  playback) run their own frame or Web Animation, because they track the
  pointer or the layout.
- **Scene renderers** (the three salons, the projection) keep their own
  time-bases and shaders; only their frames, `dt`, pixel ratio and leaving come
  from the engine.
- **Data-viz geometry** (the career chart's 3px gaps and bar corners) follows
  the chart, not the radius scale.

Anything else that seems to need an exception needs a role instead.
