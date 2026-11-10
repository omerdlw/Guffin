import {
  PASSAGE_ABANDON_RUNG,
  PASSAGE_CLOSE_RUNG,
  PASSAGE_DEBOUNCE_RUNG,
  PASSAGE_GRACE_RUNG,
  PASSAGE_OPEN_RUNG,
  PASSAGE_PATIENCE_RUNG,
  PASSAGE_QUICK_RUNG,
  QUIET_RUNG,
} from "./constants";
import { Signal, Value } from "./engine";
import { CURVE } from "./time";
import type { Engine, PassagePhase } from "./types";
import { step } from "./utils";

/**
 * The page-to-page transition engine.
 *
 * One veil per engine. It is a state machine over a single `cover` value
 * (0: the page shows, 1: the page is hidden):
 *
 *   clear ──close()──▶ closing ──▶ covered ──lift()──▶ lifting ──▶ clear
 *
 * - `close()` raises the veil. A trip does it while the page leaves, so the
 *   route is never asked for until the screen is covered.
 * - `keep()` says the next page has an opening of its own (a marquee, a stage
 *   that waits for its picture) and the veil must stay until it releases.
 * - `land()` says the route has changed. A page that did not `keep()` the veil
 *   gets a short grace and then it lifts, so a skeleton is never hidden for long.
 * - `lift()` lets the next page through. The stage calls it as it releases.
 *
 * It owns no pixels: `<Passage>` draws `cover`. It owns no seconds either:
 * every duration is a rung of the ladder, and a reduced-motion reader gets
 * the quiet rung.
 */
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

  /** A trip that never landed. A replacement trip closes again within the debounce. */
  abandon() {
    if (!this.covering) return;
    this.later(step(PASSAGE_DEBOUNCE_RUNG), true);
  }

  /** Who the veil is waiting for: a stage that said so, the route, or nobody. */
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
