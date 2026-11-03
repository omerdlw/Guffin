"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { CURVE } from "../curve";
import { step } from "../ladder";
import {
  OwnedScope,
  ScopeProvider,
  useAnyStage,
  useEngine,
  useScope,
  useSectionOf,
} from "../react";
import { childScope } from "../stage";
import { Value } from "../value";

// Content that changes in place (a filter, a tab, a page of results). When
// `id` changes the old content leaves by its parts' own verbs, the new content
// takes its place as a fresh instance of the section and plays it from the
// dark. The box keeps the old height while it is empty and then settles to
// the new one, so nothing below it jumps.

// The box settles on the rung a card arrives on.
export const SETTLE_RUNG = 1;

export interface SwapProps {
  id: string;
  cue: string;
  as?: ElementType;
  className?: string;
  // The first instance plays right behind the opening instead of when it
  // is reached.
  now?: boolean;
  children: ReactNode;
}

export function Swap({
  id,
  cue,
  as: Tag = "div",
  className,
  now = false,
  children,
}: SwapProps) {
  const stage = useAnyStage();
  const engine = useEngine();
  // Inside a wall or a deck's view the swap is part of it, so whatever is
  // done to that scope is done to the swap too.
  const base = childScope(useScope(), useId());
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState({ id, scope: `${base}0` });
  // What was on screen when the id last matched: the content that leaves.
  const [held, setHeld] = useState<ReactNode>(children);
  const swapping = useRef(false);
  const latest = useRef({ id, children });
  const turns = useRef(0);
  const settle = useRef<Value | null>(null);
  const first = `${base}0`;

  useEffect(() => {
    latest.current = { id, children };
  });

  // Kept current as each render commits, so the render that first sees a new
  // id still holds the content that is on screen and not one from an earlier
  // swap, which would flash back in before it leaves.
  useLayoutEffect(() => {
    if (id === shown.id && held !== children) setHeld(children);
  });

  useEffect(() => {
    if (id === shown.id || swapping.current) return;
    swapping.current = true;
    const el = box.current;
    if (el) {
      el.style.height = `${el.offsetHeight}px`;
      el.style.overflow = "clip";
    }
    void stage.dismiss(shown.scope).then(() => {
      turns.current += 1;
      swapping.current = false;
      setShown({ id: latest.current.id, scope: `${base}${turns.current}` });
    });
    // Checked again once each swap lands, so an id that changed while the
    // old content was leaving still gets its turn.
  }, [id, shown.id]);

  // A new instance plays at once: the eye is already on it. The first one,
  // or one put back in the dark, plays when it is reached, or behind the
  // opening when the swap is `now`.
  useLayoutEffect(() => {
    if (shown.scope === first) {
      if (now) stage.cue(cue, first);
      return;
    }
    stage.cue(cue, shown.scope);
    const el = box.current;
    if (!el) return;
    const from = el.offsetHeight;
    el.style.height = "";
    const to = el.offsetHeight;
    el.style.height = `${from}px`;
    const height = (settle.current ??= new Value(engine.clock));
    height.set(from);
    const stop = height.subscribe((h) => {
      el.style.height = `${h}px`;
    });
    void height
      .to(to, {
        tween: engine.reduced.get() ? 0 : step(SETTLE_RUNG + stage.tempo),
        curve: CURVE.silk,
      })
      .then(() => {
        stop();
        el.style.height = "";
        el.style.overflow = "";
      });
    return () => stop();
  }, [shown.scope]);

  const trigger = useSectionOf(stage, cue, shown.scope);
  const content = id === shown.id ? children : held;

  return (
    <div ref={box}>
      <ScopeProvider value={shown.scope}>
        <OwnedScope value>
          <Tag className={className} key={shown.scope} ref={trigger}>
            {content}
          </Tag>
        </OwnedScope>
      </ScopeProvider>
    </div>
  );
}
