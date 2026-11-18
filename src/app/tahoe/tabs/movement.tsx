"use client";

import { type ReactNode, useRef } from "react";
import { animate } from "@/motion/lib";
import { Button } from "@omerdlw/base-framework/ui";
import {
  beat,
  DEVELOP,
  type Ease,
  LEAVE,
  SETTLE,
  spring,
  STAGGER,
  TOUCH,
  TRAVEL,
  tween,
} from "@/design/theme/motion";
import { cn } from "@/design/ui";
import { Code, Label, Page, PANEL, Section, Table } from "../kit";

const BEATS = [-4, -3, -2, -1, 0, 1] as const;

const EASES: { name: string; ease: Ease; note: string }[] = [
  {
    name: "SETTLE",
    ease: SETTLE,
    note: "Yumuşak toplanır, sarsıntısız; uzun kuyrukta durulur",
  },
  {
    name: "DEVELOP",
    ease: DEVELOP,
    note: "Yavaş başlar; görsel ve gölge için",
  },
  { name: "LEAVE", ease: LEAVE, note: "Toplanır, sonra gider" },
  {
    name: "TOUCH",
    ease: TOUCH,
    note: "İki ucu yumuşak; her dokunuş ve renk geçişi bu eğriyle (--soft-ease)",
  },
];

const SPRINGS = [
  {
    name: "spring(beat(-1))",
    value: spring(beat(-1)),
    note: "Kritik sönümlü, taşma yok",
  },
  {
    name: "spring(beat(-1), 0.2)",
    value: spring(beat(-1), 0.2),
    note: "Küçük bir sıçrama",
  },
  {
    name: "spring(beat(0), 0.35)",
    value: spring(beat(0), 0.35),
    note: "Patlayan küçük şeyler",
  },
] as const;

const SCOPES = [
  ["home", "features/home/motion.tsx", "Ana sayfa; diğerlerinin şablonu"],
  ["detail", "features/detail/motion.tsx", "Film, dizi, sezon, incelemeler"],
  ["account", "features/profile/motion.tsx", "Profil ve her sekmesi"],
  ["search", "features/search/motion.tsx", "Arama yüzeyi"],
  ["surface", "design/components/surface.tsx", "Her dock yüzeyi"],
  ["legal", "features/legal/motion.tsx", "Gizlilik ve şartlar"],
  ["directors", "features/spotlights/motion.tsx", "Yönetmenler duvarı"],
  ["salon", "features/spotlights/shell.tsx", "Oscars ve top-100"],
] as const;

const curve = ([x1, y1, x2, y2]: Ease) =>
  `M0,100 C${x1 * 100},${100 - y1 * 100} ${x2 * 100},${100 - y2 * 100} 100,0`;

function useRun() {
  const ref = useRef<HTMLDivElement>(null);
  const run = (
    pick: (ball: HTMLElement, i: number) => Parameters<typeof animate>[2],
  ) => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-ball]").forEach((ball, i) => {
      const track = ball.parentElement!;
      const end = track.clientWidth - ball.offsetWidth;
      animate(ball, { x: [0, end] }, pick(ball, i));
    });
  };
  return { ref, run };
}

function Track({ children }: { children?: ReactNode }) {
  return (
    <div className="relative h-control-sm rounded-full bg-fill ring-1 ring-edge ring-inset">
      <span
        className="absolute top-1 left-1 size-6 rounded-full bg-primary shadow-(--liquid-shadow)"
        data-ball=""
      />
      {children}
    </div>
  );
}

function Beats() {
  const { ref, run } = useRun();
  return (
    <div className={cn(PANEL, "flex flex-col gap-fib-3 p-fib-5")} ref={ref}>
      {BEATS.map((n) => (
        <div
          className="grid grid-cols-[8rem_1fr] items-center gap-fib-3"
          key={n}
        >
          <Label name={`beat(${n})`} value={`${beat(n)}s`} />
          <Track />
        </div>
      ))}
      <Button
        className="self-start"
        intent="primary"
        onClick={() => run((_, i) => tween(beat(BEATS[i]!), SETTLE))}
        shape="pill"
        size="sm"
      >
        <IconPlay /> Oynat (SETTLE)
      </Button>
    </div>
  );
}

function IconPlay() {
  return (
    <svg aria-hidden className="size-3" viewBox="0 0 12 12">
      <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
    </svg>
  );
}

function Eases() {
  const { ref, run } = useRun();
  return (
    <div className="flex flex-col gap-fib-3" ref={ref}>
      <div className="grid gap-fib-3 sm:grid-cols-2">
        {EASES.map(({ name, ease, note }) => (
          <div
            className={cn(PANEL, "flex flex-col gap-fib-3 p-fib-4")}
            key={name}
          >
            <div className="flex items-start gap-fib-4">
              <svg
                className="size-24 shrink-0 overflow-visible rounded-thumb bg-fill ring-1 ring-edge ring-inset"
                viewBox="0 0 100 100"
              >
                <path
                  className="stroke-ink-faint"
                  d="M0,100 L100,0"
                  fill="none"
                  strokeDasharray="3 3"
                />
                <path
                  className="stroke-ink"
                  d={curve(ease)}
                  fill="none"
                  strokeWidth="2.5"
                />
              </svg>
              <Label name={name} value={note} />
            </div>
            <Code>{`[${ease.join(", ")}]`}</Code>
            <Track />
          </div>
        ))}
      </div>
      <Button
        className="self-start"
        intent="primary"
        onClick={() => run((_, i) => tween(beat(0), EASES[i]!.ease))}
        shape="pill"
        size="sm"
      >
        <IconPlay /> Dördünü oynat · beat(0)
      </Button>
    </div>
  );
}

function Springs() {
  const { ref, run } = useRun();
  return (
    <div className={cn(PANEL, "flex flex-col gap-fib-3 p-fib-5")} ref={ref}>
      {SPRINGS.map(({ name, note }) => (
        <div
          className="grid grid-cols-[11rem_1fr] items-center gap-fib-3"
          key={name}
        >
          <Label name={name} value={note} />
          <Track />
        </div>
      ))}
      <Button
        className="self-start"
        intent="primary"
        onClick={() => run((_, i) => SPRINGS[i]!.value)}
        shape="pill"
        size="sm"
      >
        <IconPlay /> Yayları oynat
      </Button>
    </div>
  );
}

function Staggers() {
  const ref = useRef<HTMLDivElement>(null);
  const play = (key: keyof typeof STAGGER) => {
    ref.current
      ?.querySelectorAll<HTMLElement>("[data-dot]")
      .forEach((dot, i) => {
        animate(
          dot,
          { opacity: [0, 1], y: [TRAVEL.rise, 0] },
          tween(beat(-1), SETTLE, i * STAGGER[key]),
        );
      });
  };
  return (
    <div className={cn(PANEL, "flex flex-col gap-fib-4 p-fib-5")}>
      <div className="flex gap-fib-2" ref={ref}>
        {Array.from({ length: 12 }, (_, i) => (
          <span
            className="aspect-[2/3] flex-1 rounded-thumb bg-fill-active ring-1 ring-edge-hover ring-inset"
            data-dot=""
            key={i}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-fib-2">
        {(Object.keys(STAGGER) as (keyof typeof STAGGER)[]).map((key) => (
          <Button key={key} onClick={() => play(key)} shape="pill" size="sm">
            {key} · {STAGGER[key] * 1000}ms
          </Button>
        ))}
      </div>
    </div>
  );
}

function Travel() {
  const ref = useRef<HTMLDivElement>(null);
  const play = () => {
    ref.current
      ?.querySelectorAll<HTMLElement>("[data-travel]")
      .forEach((el) => {
        const distance = Number(el.dataset.travel);
        animate(
          el,
          { opacity: [0, 1], y: [distance, 0] },
          tween(beat(-1), SETTLE),
        );
      });
  };
  return (
    <div className={cn(PANEL, "flex flex-col gap-fib-4 p-fib-5")}>
      <div className="flex flex-wrap items-end gap-fib-3" ref={ref}>
        {(Object.entries(TRAVEL) as [string, number][]).map(([name, px]) => (
          <div className="flex flex-col items-center gap-fib-2" key={name}>
            <span
              className="center size-control-lg rounded-tile bg-primary type-control font-semibold text-on-primary"
              data-travel={px}
            >
              {px}
            </span>
            <span className="type-label text-ink-body">{name}</span>
          </div>
        ))}
      </div>
      <Button
        className="self-start"
        intent="primary"
        onClick={play}
        shape="pill"
        size="sm"
      >
        <IconPlay /> Yüksel
      </Button>
    </div>
  );
}

export function MovementTab() {
  return (
    <Page
      eyebrow="6 Hareket"
      lead="Altın oran: süreler φ'nin kuvvetleri (saniye), gecikmeler Fibonacci milisaniye, mesafeler Fibonacci piksel, eğriler φ'nin kesirlerinden. Hiçbir şey blur'lanmaz. Component'ler rolünü söyler, sayfa kendi motion.tsx'inde koreografisini yazar; CSS'e derlenir."
      source="design/theme/motion.ts · motion/stage.tsx · design/rules/06-motion.md"
      title="Hareket"
    >
      <Section
        note="φⁿ saniye: 0.146 · 0.236 · 0.382 · 0.618 · 1 · 1.618."
        title="Vuruş (beat)"
      >
        <Beats />
      </Section>
      <Section title="Eğriler">
        <Eases />
      </Section>
      <Section
        note="visualDuration: gözün hareket olarak okuduğu süre. bounce 0 kritik sönümlüdür; yalnızca patlayan küçük şeyler sıçrar."
        title="Yaylar"
      >
        <Springs />
      </Section>
      <Section
        note="Sıralı girişler: öğe 34ms, satır 55ms, adım 89ms arayla."
        title="Gecikme (stagger)"
      >
        <Staggers />
      </Section>
      <Section
        note="hair 3 · nudge 5 · step 8 · rise 13 · reach 21 · stride 34 piksel."
        title="Mesafe (travel)"
      >
        <Travel />
      </Section>
      <Section
        note="Her sayfanın kendi sahnesi var; dışarıda bırakılan rol kıpırdamaz. Azaltılmış harekette her rol yalnızca opaklık tutar, giriş en fazla 0.3s."
        title="Sahneler"
      >
        <Table
          head={["Scope", "Dosya", "Taşıdığı"]}
          rows={SCOPES.map(([a, b, c]) => [<Code key="a">{a}</Code>, b, c])}
        />
      </Section>
    </Page>
  );
}
