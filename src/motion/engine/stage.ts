import { carrierOf } from "./carry";
import { CURVE } from "./curve";
import type { Engine } from "./engine";
import { depthShade, driftReach, type Placement } from "./fields";
import { PHI, step } from "./ladder";
import {
  blank,
  blend,
  css,
  neutral,
  paint,
  type Look,
  type Written,
} from "./look";
import { arrival, departure, response } from "./matter";
import {
  lead,
  leaveLength,
  plan,
  spacing,
  type Cadence,
  type Plan,
  type Role,
  type Score,
  type Step,
} from "./score";
import { Signal } from "./signal";
import { Touch, type Force, type TouchVerb } from "./touch";
import { Value } from "./value";
import { ENTER, LEAVE, QUIET } from "./verbs";

// The stage runs one page's score. It owns the page's whole life:
//   waiting → arriving → present → leaving → gone
//
// The opening is a fixed piece of time. The curtain stays down until what the
// opening needs is ready (the picture, the fonts), or has run out of patience;
// then the whole opening is laid on the clock at once, every beat at its place
// on the score's own timeline, measured from the frame the curtain rose. What
// happens before the curtain rises is waiting; what happens after is always
// the same sequence, at the same times, in the same rhythm: nothing about it
// depends on the frame rate, the scroll, a backlog or a visit before.
//
// Everything after the opening is one queue of attention: a section reached by
// the scroll joins it when the one before has been found by the eye, and a
// backlog makes the gaps shorter.

export type Act = "waiting" | "arriving" | "present" | "leaving" | "gone";

export interface StageOptions {
  // Rungs the whole page is moved along the ladder by. Fixed for the page's
  // life: the same page, the same pace, the same opening.
  pace?: number;
}

export interface PartState {
  enter: number;
  leave: number;
  moving: boolean;
  quiet: boolean;
}

export interface PartOptions {
  index?: number;
  // Which instance of a repeated section the part belongs to. A cue with a
  // scope plays only the parts in that scope.
  scope?: string;
  ready?: boolean;
  // How long the curtain waits for this part to be ready, where it is not the
  // usual `PATIENCE`: a part that holds the curtain on purpose (a title card).
  patience?: number;
  // How the copies of this part follow each other (see `spacing`).
  cadence?: Cadence;
  // Claims (and offers onward) the picture carried across with this key.
  carry?: string;
  forces?: readonly Force[];
  // A hand on the part: hover and press springs of the part's own matter.
  touch?: TouchVerb;
  // Takes the look instead of having it written as CSS (a canvas, a shader).
  render?: (look: Look, state: PartState) => void;
  // With `render`, also write the CSS.
  css?: boolean;
}

export interface Handle {
  ready(): void;
  index(index: number): void;
  dispose(): void;
}

// How long a beat waits for its parts (images, data) before it plays anyway.
export const PATIENCE = step(3);

// Each other cue waiting behind a beat takes a rung off its gap, up to two.
export const HURRY_CAP = 2;

// With reduced motion every part only fades, all at once, in one short rung.
export const QUIET_RUNG = -1;

// A carried picture flies one rung faster than its part would arrive, and
// never longer than CARRY_CAP.
export const CARRY_DROP = 1;
export const CARRY_CAP = 2;

interface Actor {
  name: string;
  scope: string | null;
  role: Role;
  index: number;
  cadence: Cadence;
  el: HTMLElement;
  ready: boolean;
  patience: number;
  enter: Value;
  leave: Value;
  drift: { x: Value; y: Value } | null;
  placement: Placement;
  forces: readonly Force[];
  render: PartOptions["render"];
  css: boolean;
  written: Written;
  release: () => void;
}

interface Queued<P extends string> {
  step: Step<P>;
  cue: string;
  scope: string | null;
  // Where the section lies on the page (its top), for an ordered score.
  at?: number;
}

const keyOf = (name: string, scope: string | null) =>
  scope === null ? name : `${name}\u0000${scope}`;

const scopeOfKey = (key: string) => {
  const at = key.indexOf("\u0000");
  return at === -1 ? null : key.slice(at + 1);
};

// Scopes nest like paths: a swap inside a wall is `wall/swap`, a section in a
// deck's view is `view/section`. What is done to a scope is done to all of it.
export const SCOPE_SEPARATOR = "/";

export const childScope = (parent: string | null, id: string) =>
  parent === null ? id : `${parent}${SCOPE_SEPARATOR}${id}`;

export const inScope = (scope: string | null, outer: string | null) =>
  outer === null
    ? scope === null
    : scope !== null &&
      (scope === outer || scope.startsWith(outer + SCOPE_SEPARATOR));

// What a part asks the compositor to keep ready. A part in motion lifts its
// transform and opacity; a part placed at a depth is moved and softened by
// every frame of the scroll, so it stays on its own layer for as long as the
// page stands, and each frame is a compositor update instead of a repaint of
// whatever it holds (a canvas, a masked picture).
function liftOf(
  depth: number,
  moving: boolean,
  quiet: boolean,
  softened: boolean,
) {
  if (depth !== 0 && !quiet) return "transform, opacity, filter";
  if (!moving) return "";
  return softened ? "transform, opacity, filter" : "transform, opacity";
}

// Layout position, untouched by the transforms the engine itself writes.
function place(el: HTMLElement): Placement {
  let top = 0;
  let node = el;
  for (;;) {
    top += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    if (!parent) break;
    node = parent;
  }
  const fixed =
    node !== document.body && getComputedStyle(node).position === "fixed";
  return { top, fixed };
}

export class Stage<P extends string, S extends string = never> {
  readonly act = new Signal<Act>("waiting");
  readonly tempo: number;
  private readonly pace: number;
  // The opening on paper: when each beat starts and when the last part lands.
  // It is a function of the score, the pace and which parts are on stage; the
  // curtain settles the last when it rises.
  timeline: Plan<P>;

  private cast = new Map<string, Set<Actor>>();
  private queue: Queued<P>[] = [];
  private played = new Set<string>();
  private cued: { section: S; scope: string | null }[] = [];
  private nextAt = 0;
  private headSince: number | null = null;
  // The curtain: when the stage started waiting for the opening's parts, when
  // the opening was released (the frame its timeline is measured from), when
  // its last part lands, and where each opening part starts on that timeline.
  private since = 0;
  private openedAt: number | null = null;
  private openingEnd = 0;
  private starts = new Map<string, number>();
  private fonts = true;
  private run = 0;
  private dirty = new Set<Actor>();
  private flushing = false;
  private stopScheduler: (() => void) | null = null;
  private senses: (() => void)[] = [];
  private leaving: Promise<void> | null = null;
  private before: Act = "waiting";
  // While a scope stands in front of the page, the scope kept forward.
  private receding: string | null | undefined = undefined;
  private started = false;

  constructor(
    readonly engine: Engine,
    readonly score: Score<P, S>,
    { pace = 0 }: StageOptions = {},
  ) {
    this.tempo = score.tempo + pace;
    this.pace = pace;
    this.timeline = plan(score, score.opening, pace);
  }

  get leaveLength() {
    return this.quiet
      ? step(QUIET_RUNG)
      : leaveLength(this.score, this.tempo - this.score.tempo);
  }

  private get quiet() {
    return this.engine.reduced.get();
  }

  private get clock() {
    return this.engine.clock;
  }

  register(name: P, el: HTMLElement, options: PartOptions = {}): Handle {
    const role = this.score.roles[name];
    const clock = this.clock;
    const actor: Actor = {
      name,
      scope: options.scope ?? null,
      role,
      index: options.index ?? 0,
      cadence: options.cadence ?? role.cadence,
      el,
      ready: options.ready ?? true,
      patience: options.patience ?? PATIENCE,
      enter: new Value(clock),
      leave: new Value(clock),
      drift:
        role.drift !== 0
          ? { x: new Value(clock, 0, 0.01), y: new Value(clock, 0, 0.01) }
          : null,
      placement: { top: 0, fixed: false },
      forces: options.forces ?? [],
      render: options.render,
      css: options.render ? (options.css ?? false) : true,
      written: blank(),
      release: () => {},
    };

    const hand = options.touch
      ? new Touch(this.engine, {
          verb: options.touch,
          matter: role.matter,
          tempo: this.tempo,
        })
      : null;
    if (hand) actor.forces = [...actor.forces, hand];

    const dirty = () => this.touch(actor);
    const values = [actor.enter, actor.leave];
    if (actor.drift) values.push(actor.drift.x, actor.drift.y);
    const unsubscribe = [
      ...values.map((value) => value.subscribe(dirty)),
      ...actor.forces.map((force) => force.subscribe(dirty)),
    ];
    if (hand) unsubscribe.push(hand.attach(el));

    const carrier = carrierOf(this.engine);
    if (options.carry) {
      const key = options.carry;
      unsubscribe.push(carrier.source(key, el));
      const flight = step(
        Math.min(role.matter.rung + this.tempo - CARRY_DROP, CARRY_CAP),
      );
      const claimed = carrier.claim(key, el, flight, () => {
        el.style.visibility = "";
        actor.enter.set(1);
        actor.ready = true;
      });
      if (claimed) {
        actor.ready = false;
        actor.enter.set(1);
        el.style.visibility = "hidden";
        unsubscribe.push(() => {
          el.style.visibility = "";
          carrier.abandon(el);
        });
      }
    }

    actor.release = () => {
      for (const stop of unsubscribe) stop();
      for (const value of values) value.stop();
    };

    let group = this.cast.get(name);
    if (!group) {
      group = new Set();
      this.cast.set(name, group);
    }
    group.add(actor);

    const act = this.act.get();
    if (act === "leaving" || act === "gone") actor.leave.set(1);
    else if (
      this.receding !== undefined &&
      !inScope(actor.scope, this.receding)
    )
      actor.leave.set(1);
    else if (this.openedAt !== null && this.starts.has(name) && !actor.scope)
      // A copy that mounts after the curtain rose takes its place on the
      // timeline: if its beat has not started yet, it waits for it.
      this.arrive(
        actor,
        0,
        1,
        Math.max(0, (this.starts.get(name) ?? 0) - this.clock.time),
      );
    else if (this.played.has(keyOf(name, actor.scope))) this.arrive(actor, 0);

    if (role.depth !== 0) this.clock.once("read", () => this.measure(actor));
    this.paint(actor);

    return {
      ready: () => {
        actor.ready = true;
      },
      index: (index) => {
        actor.index = index;
      },
      dispose: () => {
        actor.release();
        group.delete(actor);
        this.dirty.delete(actor);
      },
    };
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.listen();
    // Sections cued before the stage started wait behind the opening.
    this.queue = this.cued.flatMap(({ section, scope }) =>
      this.steps(section, scope),
    );
    this.nextAt = this.clock.time;
    this.headSince = null;
    this.since = this.clock.time;
    this.openedAt = null;
    this.waitForFonts();
    this.act.set("arriving");
    this.schedule();
  }

  // Display type is measured and split by the words it has; the curtain does
  // not rise on a face that is still on its way.
  private waitForFonts() {
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    this.fonts = !fonts || fonts.status === "loaded";
    if (this.fonts || !fonts) return;
    const run = ++this.run;
    void fonts.ready.then(() => {
      if (this.run === run) this.fonts = true;
    });
  }

  cue(section: S, scope: string | null = null, at?: number) {
    if (this.cued.some((cue) => cue.section === section && cue.scope === scope))
      return;
    this.cued.push({ section, scope });
    if (!this.started) return;
    const steps = this.steps(section, scope, at);
    if (this.score.ordered && at !== undefined) this.insert(steps, at);
    else this.queue.push(...steps);
    if (!this.leaving) this.schedule();
  }

  // Sections reached together are taken in the order they lie on the page,
  // never ahead of the one already being played.
  private insert(steps: Queued<P>[], at: number) {
    let index = this.queue.length;
    const first = this.queue[0]?.cue;
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (item.cue === first || item.cue === this.queue[i - 1]?.cue) continue;
      if ((item.at ?? -Infinity) > at) {
        index = i;
        break;
      }
    }
    this.queue.splice(index, 0, ...steps);
  }

  // A section the eye was carried past unseen (a jump over it) is simply
  // there: its parts take no turn in the queue, so whatever is in view after
  // the jump does not wait behind them.
  pass(section: S, scope: string | null = null) {
    if (!this.started || this.leaving) {
      this.cue(section, scope);
      return;
    }
    if (this.cued.some((cue) => cue.section === section && cue.scope === scope))
      return;
    this.cued.push({ section, scope });
    for (const item of this.score.sections[section]) {
      if (!("parts" in item)) continue;
      for (const name of item.parts) {
        this.played.add(keyOf(name, scope));
        for (const actor of this.ranked(name, scope)) actor.enter.set(1);
      }
    }
  }

  private steps(section: S, scope: string | null, at?: number): Queued<P>[] {
    const cue = keyOf(section, scope);
    return this.score.sections[section].map((step) => ({
      step,
      cue,
      scope,
      at,
    }));
  }

  leave(): Promise<void> {
    if (this.leaving) return this.leaving;
    this.stopScheduler?.();
    this.stopScheduler = null;
    this.before = this.act.get();
    this.act.set("leaving");

    const runs = Array.from(this.actors(), (actor) => this.depart(actor));
    const leaving = Promise.all(runs).then(() => {
      if (this.leaving === leaving) this.act.set("gone");
    });
    this.leaving = leaving;
    return leaving;
  }

  // The trip was called off: everything comes back from wherever it got to,
  // and the score carries on from where it stopped.
  stay() {
    if (!this.leaving) return;
    this.leaving = null;
    for (const actor of this.actors())
      if (this.receding === undefined || inScope(actor.scope, this.receding))
        void this.return(actor);
    this.act.set(this.before === "waiting" ? "arriving" : this.before);
    if (this.started) this.schedule();
  }

  // One scope's parts leave on their own: a view switched away, content
  // swapped out. Nothing else on the page notices.
  dismiss(scope: string): Promise<void> {
    this.queue = this.queue.filter((item) => !inScope(item.scope, scope));
    return Promise.all(
      this.within(scope).map((actor) => this.depart(actor)),
    ).then(() => {});
  }

  // A scope back in the dark as if it had never been reached: nothing in it
  // queued, cued or played. Its sections are cued again by whoever cues them.
  reset(scope: string) {
    this.queue = this.queue.filter((item) => !inScope(item.scope, scope));
    this.cued = this.cued.filter((cue) => !inScope(cue.scope, scope));
    for (const key of Array.from(this.played))
      if (inScope(scopeOfKey(key), scope)) this.played.delete(key);
    for (const actor of this.within(scope)) {
      actor.enter.set(0);
      actor.leave.set(0);
    }
  }

  // A scope plays its section again, from the dark.
  recue(section: S, scope: string) {
    this.reset(scope);
    this.cue(section, scope);
  }

  // Everything but one scope steps back, by each part's own way of leaving,
  // without the page leaving: a wall hung in front of it.
  recede(keep: string | null = null): Promise<void> {
    this.receding = keep;
    return Promise.all(
      Array.from(this.actors())
        .filter((actor) => !inScope(actor.scope, keep))
        .map((actor) => this.depart(actor)),
    ).then(() => {});
  }

  // The page comes forward again from wherever it stepped back to.
  restore(): Promise<void> {
    const keep = this.receding;
    this.receding = undefined;
    if (keep === undefined) return Promise.resolve();
    return Promise.all(
      Array.from(this.actors())
        .filter((actor) => !inScope(actor.scope, keep))
        .map((actor) => this.return(actor)),
    ).then(() => {});
  }

  private within(scope: string) {
    return Array.from(this.actors()).filter((actor) =>
      inScope(actor.scope, scope),
    );
  }

  private depart(actor: Actor) {
    const quiet = this.quiet;
    return actor.leave.to(1, {
      tween: quiet
        ? step(QUIET_RUNG)
        : departure(actor.role.matter, this.tempo),
      curve: quiet ? CURVE.fade : CURVE.fall,
    });
  }

  private return(actor: Actor) {
    const quiet = this.quiet;
    return actor.leave.to(0, {
      tween: quiet
        ? step(QUIET_RUNG)
        : departure(actor.role.matter, this.tempo),
      curve: CURVE.silk,
    });
  }

  // Back to before the curtain: every part dark, nothing queued. Used when a
  // page is torn down, and by React's strict mode between its two mounts.
  halt() {
    this.started = false;
    this.leaving = null;
    for (const stop of this.senses) stop();
    this.senses = [];
    this.stopScheduler?.();
    this.stopScheduler = null;
    this.queue = [];
    this.cued = [];
    this.played.clear();
    this.starts.clear();
    this.openedAt = null;
    this.openingEnd = 0;
    this.run += 1;
    this.receding = undefined;
    for (const actor of this.actors()) {
      actor.enter.set(0);
      actor.leave.set(0);
      actor.drift?.x.set(0);
      actor.drift?.y.set(0);
    }
    this.act.set("waiting");
  }

  private *actors() {
    for (const group of this.cast.values()) yield* group;
  }

  private ranked(name: string, scope: string | null) {
    return Array.from(this.cast.get(name) ?? [])
      .filter((actor) => actor.scope === scope)
      .sort((a, b) => a.index - b.index);
  }

  private schedule() {
    if (this.stopScheduler) return;
    this.stopScheduler = this.clock.add("update", ({ time }) =>
      this.conduct(time),
    );
  }

  private conduct(time: number) {
    const quiet = this.quiet;

    if (this.openedAt === null) {
      if (!this.curtainReady(time)) return;
      this.release(time);
    }

    while (this.queue.length > 0 && time >= this.nextAt) {
      const head = this.queue[0];

      if ("rest" in head.step) {
        this.queue.shift();
        this.nextAt = time + (quiet ? 0 : step(head.step.rest + this.tempo));
        continue;
      }

      this.headSince ??= time;
      const parts = head.step.parts;
      const waiting = parts.some((name) =>
        this.ranked(name, head.scope).some((actor) => !actor.ready),
      );
      if (waiting && time - this.headSince < PATIENCE) break;

      this.queue.shift();
      this.headSince = null;
      const others = new Set(
        this.queue.map((item) => item.cue).filter((cue) => cue !== head.cue),
      );
      const hurry = Math.min(others.size, HURRY_CAP);

      let gap = 0;
      for (const name of parts) {
        this.played.add(keyOf(name, head.scope));
        const role = this.score.roles[name];
        const group = this.ranked(name, head.scope);
        group.forEach((actor, rank) => this.arrive(actor, rank, group.length));
        if (!quiet) gap = Math.max(gap, lead(role, this.tempo) / PHI ** hurry);
      }
      this.nextAt = time + gap;
    }

    if (this.act.get() === "arriving" && time >= this.openingEnd)
      this.act.set("present");

    if (this.queue.length === 0 && this.act.get() !== "arriving") {
      this.stopScheduler?.();
      this.stopScheduler = null;
    }
  }

  // The curtain rises when what the opening needs is there: the fonts, and
  // every part of the opening that asked to wait for its picture. A part that
  // takes too long is left behind after its patience (PATIENCE unless it asked
  // for more).
  private curtainReady(time: number) {
    const waited = time - this.since;
    if (!this.fonts && waited < PATIENCE) return false;
    const opening = this.openers();
    for (const actor of this.actors())
      if (
        !actor.ready &&
        actor.scope === null &&
        opening.has(actor.name) &&
        waited < actor.patience
      )
        return false;
    return true;
  }

  private openers() {
    const names = new Set<string>();
    for (const item of this.score.opening)
      if ("parts" in item) for (const name of item.parts) names.add(name);
    return names;
  }

  // The opening, laid on the clock in one go. Each beat is placed at its own
  // time on the score's timeline, counted from this frame; the stage does no
  // more deciding until it is over, so no frame, however late, moves a part.
  private release(time: number) {
    this.openedAt = time;
    let end = time;
    this.timeline = plan(
      this.score,
      this.score.opening,
      this.pace,
      (part) => (this.cast.get(part)?.size ?? 0) > 0,
    );
    for (const cue of this.timeline.cues) {
      for (const name of cue.parts) {
        this.played.add(keyOf(name, null));
        this.starts.set(name, time + cue.at);
        const group = this.ranked(name, null);
        group.forEach((actor, rank) => {
          end = Math.max(end, this.arrive(actor, rank, group.length, cue.at));
        });
      }
    }
    this.openingEnd = end;
    this.nextAt = time + (this.quiet ? 0 : this.timeline.after);
  }

  // Starts a part's arrival, `offset` seconds from now, and says when it will
  // have landed.
  private arrive(actor: Actor, rank: number, count = 1, offset = 0) {
    const { matter } = actor.role;
    const now = this.clock.time;
    if (this.quiet) {
      void actor.enter.to(1, { tween: step(QUIET_RUNG), curve: CURVE.fade });
      return now + step(QUIET_RUNG);
    }
    const delay =
      offset + spacing(actor.role, this.tempo, rank, count, actor.cadence);
    const tween = arrival(matter, this.tempo);
    void actor.enter.to(1, {
      tween,
      curve: CURVE[matter.curve],
      delay,
    });
    return now + delay + tween;
  }

  private listen() {
    const { scroll, viewport, layout, pointer, reduced } = this.engine;
    const deep = () => {
      for (const actor of this.actors())
        if (actor.role.depth !== 0) this.touch(actor);
    };
    const remeasure = () =>
      this.clock.once("read", () => {
        for (const actor of this.actors())
          if (actor.role.depth !== 0) this.measure(actor);
      });
    const lean = () => {
      const hand = pointer.get();
      for (const actor of this.actors()) {
        if (!actor.drift) continue;
        const spring = response(actor.role.matter, this.tempo);
        const reach = driftReach(actor.role.drift);
        actor.drift.x.to(hand.x * reach, { spring });
        actor.drift.y.to(hand.y * reach, { spring });
      }
    };
    const all = () => {
      for (const actor of this.actors()) this.touch(actor);
    };
    this.senses = [
      scroll.subscribe(deep),
      viewport.subscribe(remeasure),
      layout.subscribe(remeasure),
      pointer.subscribe(lean),
      reduced.subscribe(all),
    ];
  }

  private measure(actor: Actor) {
    const placement = place(actor.el);
    if (
      placement.top === actor.placement.top &&
      placement.fixed === actor.placement.fixed
    )
      return;
    actor.placement = placement;
    this.touch(actor);
  }

  private touch(actor: Actor) {
    this.dirty.add(actor);
    if (this.flushing) return;
    this.flushing = true;
    this.clock.once("render", () => {
      this.flushing = false;
      const dirty = Array.from(this.dirty);
      this.dirty.clear();
      for (const actor of dirty) this.paint(actor);
    });
  }

  private paint(actor: Actor) {
    const { role } = actor;
    const quiet = this.quiet;
    const look = neutral();
    blend(look, (quiet ? QUIET.enter : ENTER[role.enter])(actor.enter.current));
    blend(look, (quiet ? QUIET.leave : LEAVE[role.leave])(actor.leave.current));
    if (!quiet) {
      if (role.depth !== 0)
        blend(
          look,
          depthShade(
            role.depth,
            this.engine.scroll.get(),
            this.engine.viewport.get().height,
            actor.placement,
          ),
        );
      if (actor.drift)
        blend(look, { x: actor.drift.x.current, y: actor.drift.y.current });
      for (const force of actor.forces) blend(look, force.shade());
    }
    const moving = actor.enter.moving || actor.leave.moving;
    actor.render?.(look, {
      enter: actor.enter.current,
      leave: actor.leave.current,
      moving,
      quiet,
    });
    if (actor.css)
      actor.written = paint(
        actor.el,
        {
          ...css(look),
          willChange: liftOf(role.depth, moving, quiet, look.blur > 0.05),
        },
        actor.written,
      );
  }
}
