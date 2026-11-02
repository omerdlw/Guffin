import { carrierOf } from "./carry";
import { CURVE } from "./curve";
import type { Engine } from "./engine";
import { depthShade, driftReach, type Placement } from "./fields";
import { PHI, step, trail } from "./ladder";
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
  trailWindow,
  type Role,
  type Score,
  type Step,
} from "./score";
import { Signal } from "./signal";
import { Touch, type Force, type TouchVerb } from "./touch";
import { Value } from "./value";
import { ENTER, LEAVE } from "./verbs";

// The stage runs one page's score. It owns the page's whole life:
//   waiting → arriving → present → leaving → gone
// Attention is one queue: a beat plays when the one before has been found by
// the eye and its parts are ready (or have run out of patience). Sections cued
// by the scroll join the same queue, and a backlog makes the gaps shorter.

export type Act = "waiting" | "arriving" | "present" | "leaving" | "gone";

export interface StageOptions {
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

const OPENING = "";

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
  el: HTMLElement;
  ready: boolean;
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

  private cast = new Map<string, Set<Actor>>();
  private queue: Queued<P>[] = [];
  private played = new Set<string>();
  private cued: { section: S; scope: string | null }[] = [];
  private nextAt = 0;
  private headSince: number | null = null;
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
      el,
      ready: options.ready ?? true,
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
    this.queue = [
      ...this.score.opening.map((step) => ({
        step,
        cue: OPENING,
        scope: null,
      })),
      ...this.cued.flatMap(({ section, scope }) => this.steps(section, scope)),
    ];
    this.nextAt = this.clock.time;
    this.headSince = null;
    this.act.set("arriving");
    this.schedule();
  }

  cue(section: S, scope: string | null = null) {
    if (this.cued.some((cue) => cue.section === section && cue.scope === scope))
      return;
    this.cued.push({ section, scope });
    if (!this.started) return;
    this.queue.push(...this.steps(section, scope));
    if (!this.leaving) this.schedule();
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

  private steps(section: S, scope: string | null): Queued<P>[] {
    const cue = keyOf(section, scope);
    return this.score.sections[section].map((step) => ({ step, cue, scope }));
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
        this.ranked(name, head.scope).forEach((actor, rank) =>
          this.arrive(actor, rank),
        );
        if (!quiet) gap = Math.max(gap, lead(role, this.tempo) / PHI ** hurry);
      }
      this.nextAt = time + gap;
    }

    if (this.act.get() === "arriving" && this.landed()) this.act.set("present");

    if (this.queue.length === 0 && this.act.get() !== "arriving") {
      this.stopScheduler?.();
      this.stopScheduler = null;
    }
  }

  private landed() {
    if (this.queue.some((item) => item.cue === OPENING)) return false;
    for (const item of this.score.opening)
      if ("parts" in item)
        for (const name of item.parts)
          for (const actor of this.ranked(name, null))
            if (actor.enter.moving) return false;
    return true;
  }

  private arrive(actor: Actor, rank: number) {
    const { matter } = actor.role;
    if (this.quiet) {
      void actor.enter.to(1, { tween: step(QUIET_RUNG), curve: CURVE.fade });
      return;
    }
    void actor.enter.to(1, {
      tween: arrival(matter, this.tempo),
      curve: CURVE[matter.curve],
      delay: trail(rank, trailWindow(actor.role, this.tempo)),
    });
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
    blend(look, (quiet ? ENTER.glow : ENTER[role.enter])(actor.enter.current));
    blend(look, (quiet ? LEAVE.fade : LEAVE[role.leave])(actor.leave.current));
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
        { ...css(look), willChange: moving ? "transform, opacity" : "" },
        actor.written,
      );
  }
}
