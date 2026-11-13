"use client";

import { type JSX, useEffect, useRef } from "react";
import { useOptionalNavigation } from "@omerdlw/base-framework/navigation";
import { usePathname } from "next/navigation";
import { changesPage, leavesPage, plainClick } from "@/motion/dom";
import { PASSAGE_GLOW, PASSAGE_LAYER, passageOf } from "@/motion/passage";
import { useEngine } from "@/motion/react";
import { step } from "@/motion/time";

const PLAIN_LINK_PATIENCE_RUNG = 2;

const GLOW_TRAVEL = 0.18;

export function Passage(): JSX.Element {
  const engine = useEngine();
  const navigation = useOptionalNavigation();
  const pathname = usePathname();
  const veil = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const passage = passageOf(engine);
    let queued = false;
    const paint = () => {
      queued = false;
      const sheet = veil.current;
      const light = glow.current;
      if (!sheet || !light) return;
      const cover = passage.cover.current;
      const moving = passage.cover.moving;
      sheet.style.visibility = cover <= 0.001 ? "hidden" : "visible";
      sheet.style.opacity = cover.toFixed(4);
      sheet.style.willChange = moving ? "opacity" : "auto";
      light.style.transform = `scale(${(1 + (1 - cover) * GLOW_TRAVEL).toFixed(4)})`;
    };
    const draw = () => {
      if (queued) return;
      queued = true;
      engine.clock.once("render", paint);
    };
    draw();
    return passage.cover.subscribe(draw);
  }, [engine]);

  useEffect(() => {
    const passage = passageOf(engine);
    return navigation.hold((trip) => {
      if (!changesPage(trip)) return;
      trip.signal.addEventListener("abort", () => passage.abandon(), {
        once: true,
      });
      return passage.close();
    });
  }, [engine, navigation]);

  useEffect(() => {
    passageOf(engine).land();
  }, [engine, pathname]);

  useEffect(() => {
    const passage = passageOf(engine);
    const press = (event: MouseEvent) => {
      if (!plainClick(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || !leavesPage(link)) return;
      const from = location.pathname;
      void passage.close();
      setTimeout(
        () => {
          if (location.pathname === from) passage.abandon();
        },
        step(PLAIN_LINK_PATIENCE_RUNG) * 1000,
      );
    };
    document.addEventListener("click", press, true);
    return () => document.removeEventListener("click", press, true);
  }, [engine]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 bg-page"
      data-passage=""
      ref={veil}
      style={{ opacity: 0, visibility: "hidden", zIndex: PASSAGE_LAYER }}
    >
      <div
        className="absolute inset-0"
        ref={glow}
        style={{ background: PASSAGE_GLOW }}
      />
    </div>
  );
}
