"use client";

import { useRef } from "react";
import { CURVE } from "../curve";
import { step } from "../ladder";
import { useAnyStage, useEngine, usePartOf } from "../react";
import { Value } from "../value";

// A number counts up as its part arrives, so it lands with the part. A hover
// counts it again on the expo curve, one rung long.

export const RECOUNT_RUNG = 1;

export interface CountProps {
  part: string;
  value: number;
  format: (value: number) => string;
  index?: number;
  className?: string;
  hover?: boolean;
}

export function Count({
  part,
  value,
  format,
  index,
  className,
  hover = false,
}: CountProps) {
  const stage = useAnyStage();
  const engine = useEngine();
  const text = useRef<HTMLSpanElement>(null);
  const arrived = useRef(0);
  const again = useRef<Value | null>(null);

  const draw = () => {
    const replay = again.current?.moving ? again.current.current : 1;
    const shown = Math.round(value * Math.min(arrived.current, replay));
    if (text.current) text.current.textContent = format(shown);
  };

  const props = usePartOf(stage, part, {
    index,
    css: true,
    render: (_look, state) => {
      arrived.current = state.quiet ? 1 : state.enter;
      draw();
    },
  });

  const recount = () => {
    if (!hover || arrived.current < 1 || engine.reduced.get()) return;
    const replay = (again.current ??= new Value(engine.clock));
    if (replay.moving) return;
    replay.set(0);
    const stop = replay.subscribe(draw);
    void replay
      .to(1, { tween: step(RECOUNT_RUNG), curve: CURVE.expo })
      .then(() => {
        stop();
        draw();
      });
  };

  return (
    <span
      {...props}
      className={className}
      onPointerEnter={hover ? recount : undefined}
    >
      <span ref={text}>{format(value)}</span>
    </span>
  );
}
