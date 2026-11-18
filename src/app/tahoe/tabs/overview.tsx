"use client";

import { Icon } from "@/design/components/icon";
import { Logo } from "@/design/components/logo";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { Code, Page, PANEL, Section, Table } from "../kit";

const PIPELINE = [
  {
    n: 1,
    name: "Token'lar",
    file: "styles/system/tokens.css · styles/tokens.css",
    what: "type-*, radius-*, spacing-control-*, spacing-fib-*, tracking-*. Tailwind'in paleti, boyutları, gölgeleri ve easing'leri kapalı.",
  },
  {
    n: 2,
    name: "Tema",
    file: "styles/themes.css",
    what: "Her değişkenin tek değeri: mürekkep basamakları, dolgular, kenarlar, seçili, cam, birincil, anlam renkleri. Hepsi kağıt renginden türer; görsel üstü için .on-photo paleti.",
  },
  {
    n: 3,
    name: "Temeller",
    file: "foundations/",
    what: "TONES, STATE, FILL, WELL, LAYER, TONE · SHELL/FLOAT/TIP/GLASS · RADIUS + nested() · sayfa ızgarası · Z_INDEX · variants()",
  },
  {
    n: 4,
    name: "Tarifler + ui",
    file: "recipes.ts → ui.ts",
    what: "Framework'ün her component parçasının görünümü (PARTS); defineUi() bunları kaydeder, cn'e özel token ailelerini öğretir.",
  },
  {
    n: 5,
    name: "Component'ler",
    file: "@omerdlw/base-framework/ui · design/components/",
    what: "Framework davranışı verir, tasarımı yoktur. Guffin kendi component'lerini ve sarmalayıcılarını yazar.",
  },
  {
    n: 6,
    name: "Modül temaları",
    file: "theme/*.ts",
    what: "Dock, modal, context menu, toast, kontroller, hata, ambient: framework slotları temellerden doldurulur.",
  },
  {
    n: 7,
    name: "Malzeme + dokunuş",
    file: "liquid.css · glass/ · liquid-touch.ts · glass-thumb.ts",
    what: "Liquid glass, basınca eğilen kontroller, cama dönen thumb'lar, cursor.",
  },
  {
    n: 8,
    name: "Sayfa koreografisi",
    file: "features/<sayfa>/motion.tsx",
    what: "defineStage(): sayfa başına tek, CSS'e derlenen koreografi.",
  },
] as const;

const PRINCIPLES = [
  {
    icon: "solar:palette-round-bold",
    title: "Her değerin bir rolü var",
    text: "Bir renk “%6 beyaz” değil, fill'dir. Bir radius “14px” değil, card'dır. Sistemi değiştirmek bir satırı değiştirmektir.",
  },
  {
    icon: "solar:sun-2-bold",
    title: "Tek tema: kağıt",
    text: "Her rolün tek değeri var; sayfa rengi görselden gelir, mürekkep ona karışır. Görsel üstündeki metin .on-photo ile açık mürekkep okur.",
  },
  {
    icon: "solar:clapperboard-play-bold",
    title: "Hareket sayfaya aittir",
    text: "Component'ler yalnızca rolünü söyler (data-part); nasıl hareket edeceğini sayfanın motion.tsx'i yazar.",
  },
  {
    icon: "solar:waterdrop-bold",
    title: "Yüzen her şey cam",
    text: "Dock, modal, menü, tooltip, toast: tek malzeme. Camın üstünde cam yok; içerideki kontrol bir WELL'dir.",
  },
] as const;

const QUICK = [
  [
    "Metin rengi",
    <Code key="c">text-ink · -lead · -body · -muted · -faint</Code>,
  ],
  ["Duran yüzey", <Code key="c">FILL / TONES.neutral</Code>],
  ["Seçili", <Code key="c">TONE.chosen · intent=&quot;chosen&quot;</Code>],
  [
    "Tek gönder aksiyonu",
    <Code key="c">&lt;Button intent=&quot;primary&quot;&gt;</Code>,
  ],
  ["Yüzen krom", <Code key="c">SHELL · FLOAT · TIP</Code>],
  ["Dock içi kontrol", <Code key="c">WELL + WELL_HOVER</Code>],
  [
    "Tipografi",
    <Code key="c">type-micro … type-heading · type-display-*</Code>,
  ],
  [
    "Radius",
    <Code key="c">rounded-mark/thumb/inset/tile/card/panel/sheet/shell</Code>,
  ],
  ["Kontrol yüksekliği", <Code key="c">h-control-xs/sm/chrome/md/lg</Code>],
  ["Katman sırası", <Code key="c">Z_INDEX</Code>],
  ["Class birleştirme", <Code key="c">cn</Code>],
  ["Hareket", <Code key="c">defineStage (motion.tsx)</Code>],
] as const;

export function OverviewTab() {
  return (
    <Page
      eyebrow="Guffin Design System"
      lead="Sinematik, kağıt temalı bir film ve dizi günlüğünün tasarım sistemi: token'lardan liquid glass'a, sekiz katman. Bu lab her katmanı kaynak koddan, canlı olarak gösterir; grade değiştikçe değerler de değişir."
      source="docs/design/"
      title="UI Lab"
    >
      <div className="grid gap-fib-3 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div className={cn(PANEL, "flex gap-fib-3 p-fib-4")} key={p.title}>
            <span className="center size-control-lg shrink-0 rounded-tile bg-fill text-ink ring-1 ring-edge ring-inset">
              <Icon icon={p.icon} size={22} />
            </span>
            <div className="flex flex-col gap-fib-1">
              <strong className="type-title font-semibold text-ink">
                {p.title}
              </strong>
              <p className="type-body text-ink-lead">{p.text}</p>
            </div>
          </div>
        ))}
      </div>

      <Section
        note="Her katman yalnızca üstündeki katmanlardan okur. Framework davranış verir; görsel olan her şey Guffin'in, src/design'da."
        title="Bir görünüm nasıl kurulur"
      >
        <ol className="grid gap-fib-2">
          {PIPELINE.map((step) => (
            <li
              className={cn(
                PANEL,
                "grid grid-cols-[auto_1fr] items-start gap-x-fib-4 gap-y-fib-1 p-fib-4 sm:grid-cols-[auto_14rem_1fr]",
              )}
              key={step.n}
            >
              <span className="center size-control-md rounded-full bg-primary type-control font-semibold text-on-primary tabular-nums">
                {step.n}
              </span>
              <span className="flex flex-col">
                <strong className="type-title font-semibold text-ink">
                  {step.name}
                </strong>
                <span className="type-label text-ink-body">{step.file}</span>
              </span>
              <p className="col-start-2 type-body text-ink-lead sm:col-start-3">
                {step.what}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Hızlı başvuru">
        <Table head={["İhtiyaç", "Kullan"]} rows={QUICK} />
      </Section>

      <Section title="İşaret">
        <div className="flex flex-wrap items-end gap-fib-5 text-ink">
          {[16, 24, 34, 55, 89].map((size) => (
            <span className="flex flex-col items-center gap-fib-2" key={size}>
              <Logo size={size} />
              <span className={cn(TONE.label, "text-ink-body")}>{size}</span>
            </span>
          ))}
        </div>
      </Section>
    </Page>
  );
}
