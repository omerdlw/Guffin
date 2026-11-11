import { carrierOf } from "./carry";
import { blank, blend, css, neutral, paint } from "./color";
import {
  BULK_SHARE,
  CARRY_CAP,
  CARRY_DROP,
  HURRY_CAP,
  PHI,
  QUIET,
  QUIET_RUNG,
  SCOPE_SEPARATOR,
} from "./constants";
import { Signal, Value } from "./engine";
import { depthShade, driftReach, Touch } from "./forces";
import { lead, leaveLength, plan, spacing } from "./score";
import { arrival, CURVE, departure, ENTER, LEAVE, response } from "./time";
import type {
  Act,
  Actor,
  Engine,
  Handle,
  PartOptions,
  Placement,
  Plan,
  Queued,
  Score,
  StageOptions,
} from "./types";
import { inScope, keyOf, liftOf, scopeOfKey, step } from "./utils";

export const PATIENCE = step(3);

export const childScope = (parent: string | null, id: string) =>
  parent === null ? id : `${parent}${SCOPE_SEPARATOR}${id}`;

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
  readonly opened = new Signal<boolean>(false);
  readonly tempo: number;
  private readonly pace: number;
  timeline: Plan<P>;

  private cast = new Map<string, Set<Actor>>();
  private queue: Queued<P>[] = [];
  private played = new Set<string>();
  private begun = new Set<string>();
  private cued: { section: S; scope: string | null; at?: number }[] = [];
  private nextAt = 0;
  private headSince: number | null = null;
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
      radius: null,
      bulk: null,
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
    this.queue = this.waiting().flatMap(({ section, scope, at }) =>
      this.steps(section, scope, at),
    );
    this.nextAt = this.clock.time;
    this.headSince = null;
    this.since = this.clock.time;
    this.openedAt = null;
    this.waitForFonts();
    this.act.set("arriving");
    this.schedule();
  }

  private waiting() {
    if (!this.score.ordered) return this.cued;
    const where = (at: number | undefined) => at ?? Number.POSITIVE_INFINITY;
    return this.cued
      .map((cue, order) => ({ cue, order }))
      .sort((a, b) => {
        const by = where(a.cue.at) - where(b.cue.at);
        return Number.isNaN(by) || by === 0 ? a.order - b.order : by;
      })
      .map(({ cue }) => cue);
  }

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
    this.cued.push({ section, scope, at });
    if (!this.started) return;
    const steps = this.steps(section, scope, at);
    if (this.score.ordered && at !== undefined) this.insert(steps, at);
    else this.queue.push(...steps);
    if (!this.leaving) this.schedule();
  }

  private insert(steps: Queued<P>[], at: number) {
    let index = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (this.begun.has(item.cue) || item.cue === this.queue[i - 1]?.cue)
        continue;
      if ((item.at ?? -Infinity) > at) {
        index = i;
        break;
      }
    }
    if (index === 0) this.headSince = null;
    this.queue.splice(index, 0, ...steps);
  }

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

  stay() {
    if (!this.leaving) return;
    this.leaving = null;
    for (const actor of this.actors())
      if (this.receding === undefined || inScope(actor.scope, this.receding))
        void this.return(actor);
    this.act.set(this.before === "waiting" ? "arriving" : this.before);
    if (this.started) this.schedule();
  }

  dismiss(scope: string): Promise<void> {
    this.queue = this.queue.filter((item) => !inScope(item.scope, scope));
    return Promise.all(
      this.within(scope).map((actor) => this.depart(actor)),
    ).then(() => {});
  }

  reset(scope: string) {
    this.queue = this.queue.filter((item) => !inScope(item.scope, scope));
    this.cued = this.cued.filter((cue) => !inScope(cue.scope, scope));
    for (const key of Array.from(this.begun))
      if (inScope(scopeOfKey(key), scope)) this.begun.delete(key);
    for (const key of Array.from(this.played))
      if (inScope(scopeOfKey(key), scope)) this.played.delete(key);
    for (const actor of this.within(scope)) {
      actor.enter.set(0);
      actor.leave.set(0);
    }
  }

  recue(section: S, scope: string) {
    this.reset(scope);
    this.cue(section, scope);
  }

  recede(keep: string | null = null): Promise<void> {
    this.receding = keep;
    return Promise.all(
      Array.from(this.actors())
        .filter((actor) => !inScope(actor.scope, keep))
        .map((actor) => this.depart(actor)),
    ).then(() => {});
  }

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
    this.begun.clear();
    this.starts.clear();
    this.openedAt = null;
    this.opened.set(false);
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
        this.begun.add(head.cue);
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
      this.begun.add(head.cue);
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

  private release(time: number) {
    this.openedAt = time;
    this.opened.set(true);
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

  private arrive(actor: Actor, rank: number, count = 1, offset = 0) {
    const { matter } = actor.role;
    const now = this.clock.time;
    if (this.quiet) {
      void actor.enter.to(1, { tween: step(QUIET_RUNG), curve: CURVE.fade });
      return now + step(QUIET_RUNG);
    }
    const delay =
      offset +
      spacing(actor.role, this.tempo, rank, count, actor.cadence, actor.index);
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

  private bulky(actor: Actor) {
    if (actor.bulk !== null) return actor.bulk;
    const { width, height } = this.engine.viewport.get();
    const area = actor.el.offsetWidth * actor.el.offsetHeight;
    if (area === 0 || width === 0 || height === 0) return false;
    return (actor.bulk = area > width * height * BULK_SHARE);
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
    if (look.blur > 0.05 && this.bulky(actor)) look.blur = 0;
    const moving = actor.enter.moving || actor.leave.moving;
    actor.render?.(look, {
      enter: actor.enter.current,
      leave: actor.leave.current,
      moving,
      quiet,
    });
    if (actor.css) {
      const clipped =
        look.clipTop > 0 ||
        look.clipRight > 0 ||
        look.clipBottom > 0 ||
        look.clipLeft > 0;
      if (!clipped) actor.radius = null;
      else if (actor.radius === null) {
        actor.radius = radiusOf(actor.el);
      }
      actor.written = paint(
        actor.el,
        {
          ...css(look, actor.radius ?? ""),
          willChange: liftOf(role.depth, moving, quiet, look.blur > 0.05),
        },
        actor.written,
      );
    }
  }
}

function radiusOf(el: HTMLElement) {
  let node: Element | null = el;
  for (let depth = 0; node && depth < 4; depth++) {
    const radius = getComputedStyle(node).borderRadius;
    if (/[1-9]/.test(radius)) return radius;
    node = node.firstElementChild;
  }
  return "";
}
