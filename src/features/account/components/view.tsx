"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CURVE,
  ScopeProvider,
  Value,
  childScope,
  step,
  useEngine,
  useScope,
} from "@/motion/engine";
import { AccountPart, AccountSection, useAccountStage } from "../motion";

// The box settles on the rung a card arrives on.
const SETTLE_RUNG = 1;

// The page under the tabs. A trip to another tab changes the page in
// place: what is on screen leaves by its parts' own verbs, then the new tab
// takes its place as a fresh instance and plays its sections as they are
// reached, the first of them right behind the opening. The box keeps the old
// height while it is empty and settles to the new one, so the footer never
// jumps.
//
// Unlike a `Swap`, the content does not share one cue: each section in it is
// its own scope under this one, so a long tab is played as it is scrolled.
export function AccountView({
  children,
  id,
}: {
  children: ReactNode;
  id: string;
}) {
  const stage = useAccountStage();
  const engine = useEngine();
  const base = childScope(useScope(), useId());
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState({ id, scope: `${base}0` });
  // What was on screen when the id last matched: the content that leaves.
  const [held, setHeld] = useState<ReactNode>(children);
  const swapping = useRef(false);
  const latest = useRef({ id, children });
  const turns = useRef(0);
  const settle = useRef<Value | null>(null);

  useEffect(() => {
    latest.current = { id, children };
  });

  // Kept current as each render commits, so the render that first sees a new
  // id still holds what is on screen and not one from an earlier trip.
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
    // Checked again once each trip lands, so an id that changed while the old
    // content was leaving still gets its turn.
  }, [id, shown.id, shown.scope, stage, base]);

  useLayoutEffect(() => {
    if (turns.current === 0) return;
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
  }, [shown.scope, engine, stage]);

  const content = id === shown.id ? children : held;

  return (
    <div className="w-full pt-8 sm:pt-10" ref={box}>
      <ScopeProvider value={shown.scope}>
        <div key={shown.scope}>{content}</div>
      </ScopeProvider>
    </div>
  );
}

// A tab that is still one block (a diary, a list of lists, the activity log):
// it comes in as a page, as soon as the opening has made room for it.
export function AccountPage({ children }: { children: ReactNode }) {
  return (
    <AccountSection as="div" className="w-full" cue="page" now>
      <AccountPart name="page">{children}</AccountPart>
    </AccountSection>
  );
}
