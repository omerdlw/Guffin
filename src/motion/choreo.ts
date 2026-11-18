// A page's choreography, compiled to CSS. The page's motion.tsx writes what
// every role does (entering, hover, focus, press, its text) and this file
// turns it into one stylesheet scoped to the page root.
//
// Entrances are timed CSS animations that wait, paused on their first frame,
// for a trigger the stage sets:
// - "load": the page is hydrated and painted (`data-play` on the root), so the
//   opening plays where the reader can see it, never behind a busy first load;
// - "view": the element, or its section, has come into view (`data-seen`);
// - "ready": the nearest picture has loaded (`data-ready`).
// Drift is the one scrubbed motion: a move tied directly to scrolling.
// Touch states are transitions on translate, scale, rotate, opacity, filter.

export type Curve = readonly [number, number, number, number];

type Offset = number | string;

export interface Look {
  x?: Offset;
  y?: Offset;
  // Numbers are px / deg / factors; strings are CSS expressions, e.g.
  // `calc(var(--fan-r) * 1.3)`.
  scale?: number | string | readonly [number, number];
  rotate?: number | string;
  // Rotation about the horizontal axis, for a panel that tips toward or away
  // from the reader. Shares the `rotate` property with `rotate`; tilt wins.
  tilt?: number | string;
  opacity?: number;
  bright?: number | string;
  // A mask, as a `clip-path` (e.g. `inset(100% 0 0 0)`: shut from the top,
  // so it opens upwards). Entrances open it to `inset(0)`.
  clip?: string;
}

export interface Beat extends Look {
  duration: number;
  ease?: Curve;
  // Seconds the move waits before it starts (one thing after another:
  // a label that appears once its box has opened).
  delay?: number;
}

export interface Enter {
  on: "load" | "view" | "ready";
  from: Look;
  duration: number;
  delay?: number;
  ease?: Curve;
  // Seconds between items by their `index`; `wrap` restarts the count every
  // n items so a grid cascades across a row, not down the page.
  stagger?: number;
  wrap?: number;
  // For "view": wait for the element itself or for its section. Items in a
  // horizontal scroller follow their section.
  along?: "self" | "section";
  // For a text: the most seconds its units may spread over, however many
  // there are. The stagger shrinks to fit a long text.
  budget?: number;
}

// A continuous move tied to scrolling: from rest to `to` across the range.
// `page` reads the document's scroll (ranges in lengths, e.g. ["0px",
// "100vh"]); `view` reads the element's view timeline.
export interface Drift {
  to: Look;
  range: readonly [string, string];
  on?: "page" | "view";
  ease?: Curve;
}

export interface TextMoves {
  by: "word" | "char";
  // Each word or letter rises out of its own clip.
  mask?: boolean;
  // Which unit plays first: in reading order, from the middle outwards, or
  // scattered.
  order?: "forward" | "center" | "random";
  // Seconds between words or letters.
  stagger: number;
  // Seconds between two texts of the same part (their `index`).
  line?: number;
  // The most seconds the units may spread over (see Enter.budget).
  budget?: number;
  enter: Enter;
}

// How a role leaves when a `Swap` replaces it: from rest to `to`, then the
// new content enters.
export interface Leave {
  to: Look;
  duration: number;
  ease?: Curve;
}

// Animations that play as a swapped-out role leaves end in this suffix; the
// Swap waits for one of them before showing the new content.
export const LEAVING = "-x";

// Properties something else sets (a class swap, a framework writing a box)
// that should glide to their new value instead of jumping.
export type Followed =
  | "color"
  | "background-color"
  | "transform"
  | "translate"
  | "scale"
  | "opacity"
  | "width"
  | "height"
  | "flex-grow"
  | "visibility"
  | "grid-template-rows";

export interface Follow {
  of: readonly Followed[];
  duration: number;
  ease?: Curve;
  delay?: number;
}

export interface Moves {
  enter?: Enter;
  leave?: Leave;
  follow?: Follow;
  scroll?: Drift;
  hover?: Beat;
  focus?: Beat | "hover";
  press?: Beat;
  // How the role returns to rest; defaults to the hover's curve, 1.5× slower.
  rest?: { duration: number; ease?: Curve; delay?: number };
  origin?: string;
  text?: TextMoves;
  slots?: Partial<Record<Slot, Omit<Moves, "slots" | "text">>>;
}

// Shared components mark themselves with a kind; their inner pieces with a
// slot. The framework's Button takes no data attributes, so its recipe
// carries a marker class instead.
const KINDS = {
  media: '[data-kind="media"]',
  button: ".choreo-button",
  arrow: ".choreo-arrow",
  segmented: ".choreo-segmented",
} as const;

const SLOTS = {
  frame: '[data-slot="frame"]',
  image: '[data-slot="frame"] img',
  caption: '[data-slot="caption"]',
  picture: '[data-slot="picture"]',
  // The hero's clipping box around the picture. Blur and scale the picture
  // here: the mask and the blur then share one surface. On the canvas inside
  // they split into layers and a pixel row seams at the foot.
  screen: '[data-slot="screen"]',
  // A tab bar's CSS-driven sliding pill (the framework Tabs) and tabs. The
  // segmented control's indicator moves on its own spring: no pill here.
  pill: "[data-pill]",
  tab: '[role="tab"]',
  rule: '[data-slot="rule"]',
  // A result row's thumbnail (poster, portrait, avatar).
  thumb: '[data-slot="thumb"]',
  // A heading's actions (its tabs, a progress readout), and its icon.
  actions: '[data-slot="actions"]',
  icon: '[data-slot="icon"]',
  // A folder: its back panel, the deck of leaves inside it (held upright
  // while the panel tips), each leaf, and the front flap.
  folder: '[data-slot="folder"]',
  deck: '[data-slot="deck"]',
  leaf: '[data-slot="leaf"]',
  flap: '[data-slot="flap"]',
  // A closed seat's name, run up its side, and the shade that dims a closed
  // seat (the cast strip).
  spine: '[data-slot="spine"]',
  shade: '[data-slot="shade"]',
} as const;

export type Kind = keyof typeof KINDS;
export type Slot = keyof typeof SLOTS;

export interface Choreography<P extends string, S extends string> {
  parts?: Partial<Record<P, Moves>>;
  sections?: Partial<Record<S, Moves>>;
  kinds?: Partial<Record<Kind, Moves>>;
}

const STANDARD: Curve = [0.2, 0, 0, 1];

const curve = (c: Curve = STANDARD) => `cubic-bezier(${c.join(", ")})`;
const offset = (v: Offset | undefined) =>
  v === undefined ? "0" : typeof v === "number" ? `${v}px` : v;
const seconds = (s: number) => `${Math.round(s * 1000)}ms`;
const degrees = (v: number | string) => (typeof v === "number" ? `${v}deg` : v);

function declare(look: Look, reduced: boolean): string[] {
  const out: string[] = [];
  if (look.opacity !== undefined) out.push(`opacity: ${look.opacity}`);
  if (reduced) return out;
  if (look.x !== undefined || look.y !== undefined)
    out.push(`translate: ${offset(look.x)} ${offset(look.y)}`);
  if (look.scale !== undefined)
    out.push(
      `scale: ${typeof look.scale === "object" ? look.scale.join(" ") : look.scale}`,
    );
  if (look.tilt !== undefined) out.push(`rotate: x ${degrees(look.tilt)}`);
  else if (look.rotate !== undefined)
    out.push(`rotate: ${degrees(look.rotate)}`);
  if (look.bright !== undefined) out.push(`filter: brightness(${look.bright})`);
  if (look.clip !== undefined) out.push(`clip-path: ${look.clip}`);
  return out;
}

function properties(looks: (Look | undefined)[], reduced: boolean) {
  const used = new Set<string>();
  for (const look of looks) {
    if (!look) continue;
    for (const line of declare(look, reduced)) used.add(line.split(":")[0]!);
  }
  return [...used];
}

const rule = (selector: string, lines: string[]) =>
  lines.length ? `${selector}{${lines.join(";")}}` : "";

// Where a target sits: the page root, the role that owns it, and the target.
interface Place {
  root: string;
  host: string;
  target: string;
}

const below = (outer: string, inner: string) => inner.slice(outer.length + 1);

// Every gate waits for the opening (`data-play`): a part already in view
// under a curtain plays once the curtain lifts, not behind it.
function gate(place: Place, enter: Enter): string {
  const { root, host, target } = place;
  const played = `${root}[data-play]`;
  const inside = (selector: string) => `${played} ${below(root, selector)}`;
  if (enter.on === "load") return inside(target);
  if (enter.on === "ready")
    return `${played} [data-ready] ${below(root, target)}`;
  if (enter.along === "section")
    return `${played} [data-section][data-seen] ${below(root, target)}`;
  return host === target
    ? `${inside(target)}[data-seen]`
    : `${inside(host)}[data-seen] ${below(host, target)}`;
}

interface Track {
  keyframes: string;
  shorthand: string;
  timeline?: string;
  range?: string;
  gate?: string;
}

function enterTrack(
  place: Place,
  name: string,
  enter: Enter,
  reduced: boolean,
  order = "var(--i, 0)",
  line = 0,
): Track | null {
  const from = declare(enter.from, reduced);
  if (!from.length) return null;
  const duration = reduced ? Math.min(enter.duration, 0.3) : enter.duration;
  const at = enter.wrap ? `mod(${order}, ${enter.wrap})` : order;
  const parts = [seconds(enter.delay ?? 0)];
  if (enter.stagger && enter.budget)
    parts.push(
      `${at} * min(${seconds(enter.stagger)}, ${seconds(enter.budget)} / max(var(--n, 1) - 1, 1))`,
    );
  else if (enter.stagger) parts.push(`${at} * ${seconds(enter.stagger)}`);
  if (line) parts.push(`var(--i, 0) * ${seconds(line)}`);
  const delay = parts.length > 1 ? `calc(${parts.join(" + ")})` : parts[0];
  // A mask has no neutral value to ease towards: open it explicitly.
  const open = enter.from.clip !== undefined && !reduced;
  return {
    keyframes: `@keyframes ${name}{from{${from.join(";")}}${open ? "to{clip-path: inset(0 0 0 0)}" : ""}}`,
    shorthand: `${name} ${seconds(duration)} ${curve(enter.ease)} ${delay} backwards`,
    gate: gate(place, enter),
  };
}

function driftTrack(
  name: string,
  drift: Drift,
  reduced: boolean,
): Track | null {
  if (reduced) return null;
  const to = declare(drift.to, false);
  if (!to.length) return null;
  return {
    keyframes: `@keyframes ${name}{to{${to.join(";")}}}`,
    shorthand: `${name} ${curve(drift.ease ?? [0, 0, 1, 1])} both`,
    timeline: drift.on === "view" ? "view(block)" : "scroll(root block)",
    range: `${drift.range[0]} ${drift.range[1]}`,
  };
}

function trackRules(selector: string, tracks: (Track | null)[]): string {
  const all = tracks.filter((t): t is Track => t !== null);
  if (!all.length) return "";
  // A gated animation waits paused on its first frame; its gate releases it.
  // Ungated ones (drift) always run.
  const emit = (list: Track[], extra: string[] = []) => {
    const states = (open?: Track) =>
      list
        .map((t) => (!t.gate || t === open ? "running" : "paused"))
        .join(", ");
    return (
      rule(selector, [
        `animation: ${list.map((t) => t.shorthand).join(", ")}`,
        ...extra,
        `animation-play-state: ${states()}`,
      ]) +
      list
        .filter((t) => t.gate)
        .map((t) => rule(t.gate!, [`animation-play-state: ${states(t)}`]))
        .join("")
    );
  };

  const timed = all.filter((t) => !t.timeline);
  let css = all.map((t) => t.keyframes).join("");
  if (timed.length) css += emit(timed);
  if (timed.length === all.length) return css;
  return `${css}@supports (animation-timeline: view()){${emit(all, [
    `animation-timeline: ${all.map((t) => t.timeline ?? "auto").join(", ")}`,
    `animation-range: ${all.map((t) => t.range ?? "normal").join(", ")}`,
  ])}}`;
}

// The properties every touch glides (interaction.css `--soft-props`).
const SOFT = [
  "color",
  "background-color",
  "border-color",
  "outline-color",
  "outline-offset",
  "text-decoration-color",
  "fill",
  "stroke",
  "box-shadow",
];

function stateRules(
  host: string,
  target: string,
  moves: Omit<Moves, "slots" | "text">,
  reduced: boolean,
): string {
  const focus = moves.focus === "hover" ? moves.hover : moves.focus;
  const props = [
    ...new Set([
      ...properties([moves.hover, focus, moves.press], reduced),
      ...(moves.follow?.of ?? []),
    ]),
  ];
  if (!props.length) return "";

  const lead = moves.hover ?? focus ?? moves.press;
  // Back at rest, a followed property keeps its own pace.
  const rest = moves.rest ??
    moves.follow ?? { duration: lead!.duration * 1.5, ease: lead!.ease };
  // The site's softness (interaction.css) rides along: a role's colour,
  // fill and shadow still glide, at the soft pace, beside its own moves.
  const soft = SOFT.filter((p) => !props.includes(p));
  // A delay on one state is undone explicitly on the others.
  const delayed =
    !reduced &&
    [rest, moves.hover, focus, moves.press].some((beat) => beat?.delay);
  const timing = (
    beat: { duration: number; ease?: Curve; delay?: number },
    pace: "in" | "out",
  ) => [
    `transition-duration: ${[
      ...props.map(() =>
        seconds(reduced ? Math.min(beat.duration, 0.2) : beat.duration),
      ),
      ...soft.map(() => `var(--soft-${pace})`),
    ].join(", ")}`,
    `transition-timing-function: ${[
      ...props.map(() => curve(beat.ease)),
      ...soft.map(() => "var(--soft-ease)"),
    ].join(", ")}`,
    ...(delayed
      ? [
          `transition-delay: ${[
            ...props.map(() => seconds(beat.delay ?? 0)),
            ...soft.map(() => "0s"),
          ].join(", ")}`,
        ]
      : []),
  ];

  let css = rule(target, [
    `transition-property: ${[...props, ...soft].join(", ")}`,
    ...timing(rest, "out"),
    ...(moves.origin ? [`transform-origin: ${moves.origin}`] : []),
  ]);

  const at = (state: string) =>
    host === target
      ? `${host}${state} `
      : `${host}${state} ${target.slice(host.length + 1)}`;
  const swap = (state: string) => at(state).trim();

  if (moves.hover)
    css += `@media (hover: hover){${rule(swap(":hover"), [
      ...declare(moves.hover, reduced),
      ...timing(moves.hover, "in"),
    ])}}`;
  if (focus)
    css += rule(
      `:is(${swap(":focus-visible")}, ${swap(":has(:focus-visible)")})`,
      [...declare(focus, reduced), ...timing(focus, "in")],
    );
  if (moves.press)
    css += rule(swap(":not(:disabled, [aria-disabled='true']):active"), [
      ...declare(moves.press, reduced),
      ...timing(moves.press, "in"),
    ]);
  return css;
}

function leaveRules(
  target: string,
  name: string,
  leave: Leave,
  reduced: boolean,
): string {
  const to = declare(leave.to, reduced);
  if (!to.length) return "";
  const duration = reduced ? Math.min(leave.duration, 0.3) : leave.duration;
  return (
    `@keyframes ${name}{to{${to.join(";")}}}` +
    rule(`${target}[data-leaving]`, [
      `animation: ${name} ${seconds(duration)} ${curve(leave.ease)} forwards`,
      "animation-play-state: running",
      "animation-timeline: auto",
      "pointer-events: none",
    ])
  );
}

function textRules(
  place: Place,
  name: string,
  text: TextMoves,
  reduced: boolean,
): string {
  const { target } = place;
  const unit = text.by === "word" ? "[data-w]" : "[data-c]";
  const order = text.by === "word" ? "var(--w, 0)" : "var(--c, 0)";
  let css = rule(`${target} [data-w], ${target} [data-c]`, [
    "display: inline-block",
  ]);
  if (text.mask && !reduced)
    css += rule(`${target} [data-m]`, [
      "display: inline-block",
      "overflow: clip",
      "padding-block: 0.12em",
      "margin-block: -0.12em",
    ]);
  const inner = { ...place, host: target, target: `${target} ${unit}` };
  css += trackRules(inner.target, [
    enterTrack(
      inner,
      name,
      { ...text.enter, stagger: text.stagger, budget: text.budget },
      reduced,
      order,
      text.line ?? 0,
    ),
  ]);
  return css;
}

function movesRules(
  place: Place,
  name: string,
  moves: Moves,
  reduced: boolean,
): string {
  const { host, target } = place;
  let css = trackRules(target, [
    moves.enter ? enterTrack(place, name, moves.enter, reduced) : null,
    moves.scroll ? driftTrack(`${name}-d`, moves.scroll, reduced) : null,
  ]);
  css += stateRules(host, target, moves, reduced);
  if (moves.leave)
    css += leaveRules(target, `${name}${LEAVING}`, moves.leave, reduced);
  if (moves.text) css += textRules(place, `${name}-t`, moves.text, reduced);

  for (const [slot, slotMoves] of Object.entries(moves.slots ?? {})) {
    if (!slotMoves) continue;
    css += movesRules(
      { ...place, host: target, target: `${target} ${SLOTS[slot as Slot]}` },
      `${name}-${slot}`,
      slotMoves,
      reduced,
    );
  }
  return css;
}

export function compile<P extends string, S extends string>(
  scope: string,
  choreo: Choreography<P, S>,
): string {
  const root = `[data-choreo="${scope}"]`;
  const groups: [
    string,
    Partial<Record<string, Moves>> | undefined,
    (k: string) => string,
  ][] = [
    ["p", choreo.parts, (k) => `[data-part="${k}"]`],
    ["s", choreo.sections, (k) => `[data-section="${k}"]`],
    ["k", choreo.kinds, (k) => KINDS[k as Kind]],
  ];

  const build = (reduced: boolean) => {
    let css = "";
    for (const [tag, group, select] of groups)
      for (const [key, moves] of Object.entries(group ?? {})) {
        if (!moves) continue;
        const target = `${root} ${select(key)}`;
        css += movesRules(
          { root, host: target, target },
          `c-${scope}-${tag}-${key}${reduced ? "-r" : ""}`,
          moves,
          reduced,
        );
      }
    return css;
  };

  return `@media (prefers-reduced-motion: no-preference){${build(false)}}@media (prefers-reduced-motion: reduce){${build(true)}}`;
}

// A stage's pace. `tempo` stretches every entrance and leave (duration,
// delay, stagger, budget): √φ moves each beat half a step slower. `reach`
// lengthens the distance an entrance travels (its px offsets): φ moves each
// Fibonacci step one up (8 → 13, 13 → 21…). Touch, drift and follow are the
// hand's and keep their own time.
export interface Pace {
  tempo?: number;
  reach?: number;
}

export function paced<P extends string, S extends string>(
  choreo: Choreography<P, S>,
  { tempo = 1, reach = 1 }: Pace,
): Choreography<P, S> {
  if (tempo === 1 && reach === 1) return choreo;
  const t = (v: number | undefined) =>
    v === undefined ? undefined : Math.round(v * tempo * 1000) / 1000;
  const far = (v: Offset | undefined) =>
    typeof v === "number" ? Math.round(v * reach * 10) / 10 : v;
  const enter = (e: Enter): Enter => ({
    ...e,
    from: { ...e.from, x: far(e.from.x), y: far(e.from.y) },
    duration: t(e.duration)!,
    delay: t(e.delay),
    stagger: t(e.stagger),
    budget: t(e.budget),
  });
  const moves = <M extends Omit<Moves, "slots" | "text">>(m: M): M => ({
    ...m,
    ...(m.enter ? { enter: enter(m.enter) } : {}),
    ...(m.leave
      ? { leave: { ...m.leave, duration: t(m.leave.duration)! } }
      : {}),
  });
  const role = (m: Moves | undefined): Moves | undefined =>
    m && {
      ...moves(m),
      ...(m.text
        ? {
            text: {
              ...m.text,
              stagger: t(m.text.stagger)!,
              line: t(m.text.line),
              budget: t(m.text.budget),
              enter: enter(m.text.enter),
            },
          }
        : {}),
      ...(m.slots
        ? {
            slots: Object.fromEntries(
              Object.entries(m.slots).map(([k, s]) => [k, s && moves(s)]),
            ),
          }
        : {}),
    };
  const group = <K extends string>(g: Partial<Record<K, Moves>> | undefined) =>
    g &&
    (Object.fromEntries(
      Object.entries(g).map(([k, m]) => [k, role(m as Moves)]),
    ) as Partial<Record<K, Moves>>);
  return {
    parts: group(choreo.parts),
    sections: group(choreo.sections),
    kinds: group(choreo.kinds),
  };
}
