import { Z_INDEX } from "@/design/foundations/z-index";
import { type Engine, Signal, Value } from "./engine";
import { CURVE, QUIET_RUNG, step } from "./time";

type PassagePhase = "clear" | "closing" | "covered" | "lifting";

export const PASSAGE_LAYER = Z_INDEX.DOCK_BACKDROP - 30;

const PASSAGE_CLOSE_RUNG = 0;

const PASSAGE_QUICK_RUNG = -2;

const PASSAGE_OPEN_RUNG = 2;

const PASSAGE_ABANDON_RUNG = -1;

const PASSAGE_GRACE_RUNG = 1;

const PASSAGE_PATIENCE_RUNG = 5;

const PASSAGE_DEBOUNCE_RUNG = -3;

export const PASSAGE_GLOW = `radial-gradient(64% 52% at 50% 46%, color-mix(in oklch, var(--ambient-vibrant-70, transparent) 14%, transparent), transparent 74%)`;

export class Passage {
  readonly phase = new Signal<PassagePhase>("clear");
  readonly cover: Value;

  private held = false;
  private landed = false;
  private run = 0;
  private closing: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private engine: Engine) {
    this.cover = new Value(engine.clock);
  }

  get covering() {
    return this.phase.get() !== "clear";
  }

  private get quiet() {
    return this.engine.reduced.get();
  }

  close({ quick = false, keep = false } = {}): Promise<void> {
    this.silence();
    if (keep) this.held = true;

    const phase = this.phase.get();
    if (phase === "covered") {
      this.settle();
      return Promise.resolve();
    }
    if (phase === "closing" && this.closing) return this.closing;

    this.landed = false;
    const run = ++this.run;
    this.phase.set("closing");
    const tween = this.quiet
      ? step(QUIET_RUNG)
      : step(quick ? PASSAGE_QUICK_RUNG : PASSAGE_CLOSE_RUNG);
    const closing = this.cover
      .to(1, { tween, curve: CURVE.fade })
      .then((finished) => {
        if (!finished || this.run !== run) return;
        this.closing = null;
        this.phase.set("covered");
        this.settle();
      });
    this.closing = closing;
    return closing;
  }

  keep() {
    if (!this.covering) return;
    this.held = true;
    this.settle();
  }

  land() {
    if (!this.covering) return;
    this.landed = true;
    this.settle();
  }

  lift({ abandon = false, delay = 0 } = {}) {
    const phase = this.phase.get();
    if (phase === "clear" || phase === "lifting") return;
    this.silence();
    this.held = false;
    this.landed = false;
    this.closing = null;

    const run = ++this.run;
    this.phase.set("lifting");
    const tween = this.quiet
      ? step(QUIET_RUNG)
      : step(abandon ? PASSAGE_ABANDON_RUNG : PASSAGE_OPEN_RUNG);
    void this.cover
      .to(0, { tween, curve: CURVE.silk, delay: this.quiet ? 0 : delay })
      .then((finished) => {
        if (finished && this.run === run) this.phase.set("clear");
      });
  }

  abandon() {
    if (!this.covering) return;
    this.later(step(PASSAGE_DEBOUNCE_RUNG), true);
  }

  private settle() {
    if (this.phase.get() === "closing") return;
    const grace = this.landed && !this.held;
    this.later(step(grace ? PASSAGE_GRACE_RUNG : PASSAGE_PATIENCE_RUNG));
  }

  private later(seconds: number, abandon = false) {
    this.silence();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.lift({ abandon });
    }, seconds * 1000);
  }

  private silence() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

const passages = new WeakMap<Engine, Passage>();

export function passageOf(engine: Engine): Passage {
  let passage = passages.get(engine);
  if (!passage) {
    passage = new Passage(engine);
    passages.set(engine, passage);
  }
  return passage;
}
