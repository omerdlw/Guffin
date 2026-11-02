"use client";

import { useState, type JSX } from "react";
import {
  EngineProvider,
  bindScore,
  defineScore,
  plan,
  useEngine,
  useTouch,
  type Act,
  type Renderer,
  type Tint,
} from "@/motion/engine";
import { useDockLinkClick } from "@/ui/hooks/use-dock-link";

const score = defineScore({
  cast: {
    backdrop: { matter: "plate", depth: 3 },
    title: "ink",
    rule: { matter: "light", enter: "wipe" },
    facts: "light",
    poster: { matter: "paper", drift: 1 },
    orb: "glass",
    row: "paper",
    medal: "metal",
  },
  opening: ["backdrop", "title", ["rule", "facts"], ["poster", "orb"]],
  sections: { rows: ["row"], medal: [{ rest: 0 }, "medal"] },
});

const { StageRoot, usePart, useSection, useScene, useAct, useStage, Text } =
  bindScore(score);

export type Variant = "a" | "b";

const PAGES: Record<
  Variant,
  { title: string; facts: string[]; tint: Tint; pace: number; other: string }
> = {
  a: {
    title: "The Godfather",
    facts: ["2h 55m", "Crime", "1972", "Paramount"],
    tint: { l: 0.74, c: 0.1, h: 60 },
    pace: 0,
    other: "/lab/engine/b",
  },
  b: {
    title: "Blade Runner, the final cut",
    facts: ["1h 57m", "Science fiction", "1982"],
    tint: { l: 0.74, c: 0.1, h: 250 },
    pace: 1,
    other: "/lab/engine",
  },
};

const ROWS = Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`);
const PACES = [-2, -1, 0, 1, 2];
const RATES = [1, 0.382, 0.146];

// A small 2D scene: a ring that breathes while it is on screen, drawn from
// the look the engine hands it rather than from CSS.
function orb(canvas: HTMLCanvasElement): Renderer | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  return {
    draw({ time, look, width, height, ratio, quiet }) {
      context.clearRect(0, 0, width, height);
      context.globalAlpha = look.opacity;
      context.filter =
        look.blur > 0.05 ? `blur(${look.blur * ratio}px)` : "none";
      const r = (Math.min(width, height) / 2.6) * look.scale;
      const breath = quiet ? 0 : Math.sin(time * 2) * 4 * ratio;
      context.lineWidth = 3 * ratio;
      context.strokeStyle = "oklch(0.86 0.08 60)";
      context.beginPath();
      context.arc(
        width / 2,
        height / 2 + look.y * ratio,
        r + breath,
        0,
        Math.PI * 2,
      );
      context.stroke();
      return !quiet;
    },
  };
}

function Scene({ variant }: { variant: Variant }): JSX.Element {
  const page = PAGES[variant];
  const rows = useSection("rows");
  const medalSection = useSection("medal");
  const go = useDockLinkClick(page.other);
  return (
    <>
      <div
        {...usePart("backdrop")}
        className="absolute inset-x-0 top-0 h-svh bg-[radial-gradient(circle_at_30%_20%,var(--tint,#6b4a2b),#140d08_60%,#000)]"
      />
      <main className="relative z-10 mx-auto max-w-4xl px-4 pt-[24vh] pb-[40vh]">
        <Text
          part="title"
          text={page.title}
          by="line"
          mask
          as="h1"
          className="font-zuume text-[clamp(4rem,12vw,9rem)] leading-[0.9] uppercase"
        />
        <div {...usePart("rule")} className="mt-6 h-px w-full bg-ink-muted" />
        <ul className="mt-6 flex flex-wrap gap-6 text-ink-body">
          {page.facts.map((fact, index) => (
            <Fact key={fact} index={index} text={fact} />
          ))}
        </ul>
        <div
          className={
            variant === "a"
              ? "mt-12 flex items-end gap-10"
              : "mt-12 flex flex-row-reverse items-end justify-end gap-10"
          }
        >
          <a href={page.other} onClick={go} aria-label="Carry the poster">
            <div
              {...usePart("poster", { carry: "poster", touch: "lift" })}
              className={
                variant === "a"
                  ? "aspect-[2/3] w-44 rounded-lg bg-[linear-gradient(160deg,#a67c52,#2b1d12)]"
                  : "aspect-[2/3] w-72 rounded-2xl bg-[linear-gradient(160deg,#a67c52,#2b1d12)]"
              }
            />
          </a>
          <canvas {...useScene("orb", orb)} className="size-40" />
        </div>
        <section ref={rows} className="mt-[60vh] grid gap-3">
          {ROWS.map((row, index) => (
            <Row key={row} index={index} text={row} />
          ))}
        </section>
        <section ref={medalSection} className="mt-[40vh] flex justify-center">
          <Medal />
        </section>
      </main>
    </>
  );
}

function Fact({ index, text }: { index: number; text: string }) {
  return (
    <li {...usePart("facts", { index })} className="text-lg">
      {text}
    </li>
  );
}

function Row({ index, text }: { index: number; text: string }) {
  return (
    <div
      {...usePart("row", { index, touch: "press" })}
      className="rounded-lg bg-fill px-5 py-4 text-ink-body"
    >
      {text}
    </div>
  );
}

function Medal() {
  return (
    <div
      {...usePart("medal", { touch: "glow" })}
      className="size-40 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff3c4,#e9c46a_40%,#6b5320)]"
    />
  );
}

function Readout({ pace }: { pace: number }) {
  const act: Act = useAct();
  const stage = useStage();
  const { cues, length } = plan(score, score.opening, pace);
  return (
    <div className="flex flex-col gap-1">
      <span data-act={act}>act: {act}</span>
      <span>
        opening:{" "}
        {cues
          .map((cue) => `${cue.parts.join("+")}@${cue.at.toFixed(2)}`)
          .join(" · ")}{" "}
        → {length.toFixed(2)}s
      </span>
      <span>
        tempo: {stage.tempo} · leave: {stage.leaveLength.toFixed(2)}s
      </span>
      <button
        type="button"
        className="self-start rounded bg-fill-hover px-3 py-1"
        onClick={() => void stage.leave()}
      >
        Leave
      </button>
    </div>
  );
}

function Controls({
  pace,
  setPace,
  replay,
}: {
  pace: number;
  setPace: (pace: number) => void;
  replay: () => void;
}) {
  const engine = useEngine();
  const [rate, setRate] = useState(1);
  const touch = useTouch({ verb: "press", matter: "light" });
  return (
    <aside className="fixed right-4 bottom-4 z-20 flex max-w-sm flex-col gap-2 rounded-xl bg-black/80 p-4 font-mono text-xs text-ink-body">
      <Readout pace={pace} />
      <div className="flex flex-wrap gap-1">
        {PACES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === pace}
            className="rounded bg-fill px-2 py-1 aria-pressed:bg-fill-active"
            onClick={() => setPace(value)}
          >
            tempo {value > 0 ? `+${value}` : value}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {RATES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === rate}
            className="rounded bg-fill px-2 py-1 aria-pressed:bg-fill-active"
            onClick={() => {
              engine.clock.rate = value;
              setRate(value);
            }}
          >
            ×{value}
          </button>
        ))}
        <button
          ref={touch}
          type="button"
          className="rounded bg-fill px-2 py-1"
          onClick={replay}
        >
          Replay
        </button>
      </div>
    </aside>
  );
}

export function EngineLab({ variant }: { variant: Variant }): JSX.Element {
  const page = PAGES[variant];
  const [pace, setPace] = useState(page.pace);
  const [take, setTake] = useState(0);

  return (
    <EngineProvider drive>
      <StageRoot
        key={`${pace}:${take}`}
        pace={pace}
        grade={page.tint}
        memory={`lab:${variant}`}
      >
        <Scene variant={variant} />
        <Controls
          pace={pace}
          setPace={setPace}
          replay={() => {
            window.scrollTo(0, 0);
            setTake((n) => n + 1);
          }}
        />
      </StageRoot>
    </EngineProvider>
  );
}
