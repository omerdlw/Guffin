"use client";

import { Button } from "@omerdlw/base-framework/ui";
import { nested, RADIUS } from "@/design/foundations/geometry";
import { Z_INDEX } from "@/design/foundations/z-index";
import { cn } from "@/design/ui";
import { Code, Label, Page, PANEL, Section, Stage, useVar } from "../kit";

const RADIUS_CLASS: Record<keyof typeof RADIUS, string> = {
  mark: "rounded-mark",
  thumb: "rounded-thumb",
  inset: "rounded-inset",
  tile: "rounded-tile",
  card: "rounded-card",
  panel: "rounded-panel",
  sheet: "rounded-sheet",
  shell: "rounded-shell",
};

const RADIUS_USE: Record<keyof typeof RADIUS, string> = {
  mark: "Kod, küçük işaret",
  thumb: "Küçük görsel",
  inset: "İç içe kart",
  tile: "Döşeme, poster",
  card: "Kart, buton",
  panel: "Panel",
  sheet: "Sayfa, modal",
  shell: "Dock kabuğu",
};

const CONTROLS = [
  { size: "xs", px: 24 },
  { size: "sm", px: 32 },
  { size: "chrome", px: 36 },
  { size: "md", px: 40 },
  { size: "lg", px: 48 },
] as const;

const FIB = [
  { name: "fib-1", px: 5 },
  { name: "fib-2", px: 8 },
  { name: "fib-3", px: 13 },
  { name: "fib-4", px: 21 },
  { name: "fib-5", px: 34 },
  { name: "fib-6", px: 55 },
  { name: "fib-7", px: 89 },
] as const;

const FIB_WIDTH: Record<(typeof FIB)[number]["name"], string> = {
  "fib-1": "w-fib-1",
  "fib-2": "w-fib-2",
  "fib-3": "w-fib-3",
  "fib-4": "w-fib-4",
  "fib-5": "w-fib-5",
  "fib-6": "w-fib-6",
  "fib-7": "w-fib-7",
};

const STACK = Object.entries(Z_INDEX)
  .filter(([, value]) => value >= 100)
  .sort((a, b) => b[1] - a[1]);

function Depth({ name, cls }: { name: string; cls: string }) {
  const value = useVar(name);
  return (
    <div className="flex flex-col gap-fib-2">
      <div className={cn("h-24 w-44 rounded-card bg-plate", cls)} />
      <Label name={<Code>{name}</Code>} value={value.slice(0, 60) || "—"} />
    </div>
  );
}

export function ShapeTab() {
  return (
    <Page
      eyebrow="3.4 – 3.8 Şekil"
      lead="Radius bir rol, piksel değil. Kontroller bir merdivende durur, boşluk Fibonacci'yi izler, derinlik gölgeden ve cam kontürden gelir, katman sırası tek bir tablodadır."
      source="foundations/geometry.ts · foundations/z-index.ts · design/rules/05-shape.md"
      title="Şekil ve boşluk"
    >
      <Section
        note="Sekiz basamak; rounded-full yalnızca pill ve daire için."
        title="Radius"
      >
        <div className="grid grid-cols-2 gap-fib-3 sm:grid-cols-4">
          {(Object.keys(RADIUS) as (keyof typeof RADIUS)[]).map((key) => (
            <div className="flex flex-col gap-fib-2" key={key}>
              <div
                className={cn(
                  RADIUS_CLASS[key],
                  "liquid liquid-flat liquid-lens aspect-[4/3] w-full",
                )}
              />
              <Label
                name={`${key} · ${RADIUS[key]}px`}
                value={RADIUS_USE[key]}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        note={
          <>
            İç içe köşeler eşmerkezli kalır: <Code>nested(outer, padding)</Code>{" "}
            = dış radius − dolgu.
          </>
        }
        title="İç içe radius"
      >
        <Stage>
          {[
            { outer: RADIUS.shell, pad: 8 },
            { outer: RADIUS.sheet, pad: 6 },
            { outer: RADIUS.panel, pad: 13 },
          ].map(({ outer, pad }) => (
            <div className="flex flex-col gap-fib-2" key={outer}>
              <div
                className="liquid liquid-lens w-56"
                style={{ borderRadius: outer, padding: pad }}
              >
                <div
                  className="h-24 bg-(--liquid-well) shadow-(--liquid-well-shadow)"
                  style={{ borderRadius: nested(outer, pad) }}
                />
              </div>
              <Label
                name={`${outer} − ${pad} = ${nested(outer, pad)}`}
                value="dış − dolgu = iç"
              />
            </div>
          ))}
        </Stage>
      </Section>

      <Section
        note="Her kontrolün yüksekliği bu merdivenden: buton, select, input, ikon buton."
        title="Kontrol merdiveni"
      >
        <Stage className="items-end">
          {CONTROLS.map(({ size, px }) => (
            <div className="flex flex-col items-center gap-fib-2" key={size}>
              <Button shape="pill" size={size}>
                {size}
              </Button>
              <Label name={`h-control-${size}`} value={`${px}px`} />
            </div>
          ))}
        </Stage>
      </Section>

      <Section
        note="5 · 8 · 13 · 21 · 34 · 55 · 89: p-fib-*, gap-fib-*, m-fib-*."
        title="Boşluk"
      >
        <div className={cn(PANEL, "flex flex-col gap-fib-2 p-fib-5")}>
          {FIB.map(({ name, px }) => (
            <div
              className="grid grid-cols-[6rem_1fr] items-center gap-fib-3"
              key={name}
            >
              <Label name={name} value={`${px}px`} />
              <span
                className={cn(
                  FIB_WIDTH[name],
                  "h-fib-3 rounded-mark bg-primary",
                )}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        note="Katmanlar sayfanın kendi tonundan kesilmiş bir lift ile kalkar; görsel üstünde siyah gölge."
        title="Derinlik"
      >
        <Stage>
          <Depth cls="shadow-(--liquid-shadow)" name="--liquid-shadow" />
          <Depth cls="shadow-(--lift)" name="--lift" />
          <Depth
            cls="shadow-[0_0_0_0.5px_var(--liquid-contour)]"
            name="--liquid-contour"
          />
          <Depth
            cls="shadow-(--glass-control-bevel)"
            name="--glass-control-bevel"
          />
        </Stage>
      </Section>

      <Section
        note={
          <>
            Sayfa düzeyindeki yığın, üstten alta. Ham z-index yok:{" "}
            <Code>Z_INDEX</Code>.
          </>
        }
        title="Katman sırası"
      >
        <div className={cn(PANEL, "flex flex-col gap-1 p-fib-4")}>
          {STACK.map(([name, value]) => (
            <div className="flex items-center gap-fib-3" key={name}>
              <span
                className="h-control-xs rounded-thumb bg-fill-active ring-1 ring-edge-hover ring-inset"
                style={{ width: `${((value - 90) / 110) * 100}%` }}
              />
              <span className="shrink-0 type-meta text-ink tabular-nums">
                {value}
              </span>
              <span className="shrink-0 type-meta text-ink-body">{name}</span>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}
