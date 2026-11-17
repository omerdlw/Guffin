"use client";

import { useEffect, useRef, useState } from "react";
import { TONE } from "@/design/foundations/tones";
import { headlineClass, PROSE_CLASS } from "@/design/foundations/layout";
import { cn } from "@/design/ui";
import { Code, Page, PANEL, Section, Table, useGradeKey } from "../kit";

const SCALE = [
  { cls: "type-micro", use: "Rozet, sayaç" },
  { cls: "type-label", use: "Etiket, eyebrow" },
  { cls: "type-meta", use: "Meta bilgi, küçük kontrol" },
  { cls: "type-control", use: "Kontrol metni" },
  { cls: "type-body", use: "Gövde, liste" },
  { cls: "type-copy", use: "Açıklama paragrafı" },
  { cls: "type-base", use: "Temel metin" },
  { cls: "type-prose", use: "Uzun okuma (inceleme)" },
  { cls: "type-prose-wide", use: "Geniş uzun okuma" },
  { cls: "type-title", use: "Kart başlığı" },
  { cls: "type-heading", use: "Bölüm başlığı" },
  { cls: "type-display-xs", use: "Display" },
  { cls: "type-display-sm", use: "Display" },
  { cls: "type-display-md", use: "Display" },
  { cls: "type-display-lg", use: "Manşet" },
  { cls: "type-display-xl", use: "Manşet" },
  { cls: "type-display-2xl", use: "Manşet" },
] as const;

const WEIGHTS = [
  { cls: "font-normal", name: "normal" },
  { cls: "font-medium", name: "medium" },
  { cls: "font-semibold", name: "semibold" },
  { cls: "font-bold", name: "bold" },
] as const;

const TRACKING = [
  { cls: "tracking-label", name: "label · 0.14em" },
  { cls: "tracking-tagline", name: "tagline · 0.12em" },
  { cls: "tracking-slate", name: "slate · 0.32em" },
] as const;

const HEADLINES = [
  "Heat",
  "Paris, Texas",
  "Once Upon a Time in America",
  "Eternal Sunshine of the Spotless Mind",
] as const;

function Measured({ cls, use }: { cls: string; use: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const grade = useGradeKey();
  const [metrics, setMetrics] = useState("");
  useEffect(() => {
    const style = getComputedStyle(ref.current!);
    setMetrics(
      `${style.fontSize} / ${style.lineHeight} · ${style.letterSpacing === "normal" ? "0" : style.letterSpacing}`,
    );
  }, [grade]);
  const display = cls.startsWith("type-display");
  return (
    <div className="grid grid-cols-1 items-baseline gap-x-fib-4 gap-y-fib-1 border-b border-rule px-fib-4 py-fib-3 last:border-0 sm:grid-cols-[11rem_1fr]">
      <span className="flex flex-col">
        <Code>{cls}</Code>
        <span className="mt-fib-1 type-label text-ink-body">{use}</span>
        <span className="[font-family:ui-monospace,monospace] text-[length:10px] text-ink-muted">
          {metrics}
        </span>
      </span>
      <span
        className={cn(
          cls,
          "truncate text-ink",
          display && "font-zuume font-bold uppercase",
        )}
        ref={ref}
      >
        {display ? "Guffin sinema" : "Bir film, bir gece, bir not."}
      </span>
    </div>
  );
}

export function TypeTab() {
  return (
    <Page
      eyebrow="3.3 Tipografi"
      lead="Geist metin için, Zuume manşet için. Her boyut kendi satır yüksekliği ve harf aralığıyla gelir: bir sınıf, üç değer. Her ağırlık bir basamak ağırdır: kağıttaki koyu mürekkep ince okunur. Görsel üstünde (on-photo) ağırlıklar nominal değerine döner."
      source="styles/system/tokens.css · foundations/layout.ts · design/rules/04-type.md"
      title="Tipografi"
    >
      <Section
        note="Ölçüler canlı: tarayıcının hesapladığı boyut / satır / aralık."
        title="Ölçek"
      >
        <div className={cn(PANEL, "flex flex-col p-0")}>
          {SCALE.map((s) => (
            <Measured key={s.cls} {...s} />
          ))}
        </div>
      </Section>

      <Section
        note="Uzunluğa göre basamak düşen manşet: headlineClass(text, limits). Kısa başlık büyük, uzun başlık küçük."
        title="Manşet"
      >
        <div className={cn(PANEL, "flex flex-col gap-fib-5 p-fib-5")}>
          {HEADLINES.map((text) => (
            <div className="flex flex-col gap-fib-2" key={text}>
              <h3 className={cn(headlineClass(text, [8, 16, 28]), "text-ink")}>
                {text}
              </h3>
              <Code>{`headlineClass("${text}") · ${text.length} harf`}</Code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Ağırlık">
        <div className={cn(PANEL, "grid gap-fib-3 p-fib-5 sm:grid-cols-4")}>
          {WEIGHTS.map((w) => (
            <div className="flex flex-col gap-fib-1" key={w.cls}>
              <span className={cn(w.cls, "type-display-xs text-ink")}>Aa</span>
              <Code>{w.cls}</Code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        note="Büyük harfli etiketler geniş aralıkla nefes alır."
        title="Aralık ve etiket"
      >
        <div className={cn(PANEL, "flex flex-col gap-fib-4 p-fib-5")}>
          {TRACKING.map((t) => (
            <div
              className="flex flex-wrap items-baseline gap-fib-4"
              key={t.cls}
            >
              <span
                className={cn(
                  t.cls,
                  "type-label font-semibold text-ink uppercase",
                )}
              >
                Şimdi gösterimde
              </span>
              <Code>{t.name}</Code>
            </div>
          ))}
          <div className="flex flex-wrap items-baseline gap-fib-4">
            <span className={TONE.label}>Bölüm etiketi</span>
            <Code>TONE.label</Code>
          </div>
          <div className="flex flex-wrap items-baseline gap-fib-4">
            <a className={TONE.link} href="#type">
              Tümünü gör
            </a>
            <Code>TONE.link</Code>
          </div>
        </div>
      </Section>

      <Section
        note="62 karakterlik ölçü, type-prose, text-pretty."
        title="Uzun okuma"
      >
        <div className={cn(PANEL, "p-fib-5")}>
          <p className={cn(PROSE_CLASS, "text-ink-lead")}>
            Film, ışığın karanlıkta bıraktığı bir izdir. Salonun ışıkları
            söndüğünde, perdeye düşen her kare bir sonrakine yer açar; biz de o
            boşlukta kendi hikâyemizi kurarız. Guffin bu izleri tutar: ne zaman,
            kiminle, ne hissettirdiğiyle. Bir günlük, bir puan, birkaç satır
            not; yıllar sonra geri döndüğünde o geceyi yeniden yaşatacak kadar.
          </p>
          <div className="mt-fib-3">
            <Code>PROSE_CLASS</Code>
          </div>
        </div>
      </Section>

      <Section title="Tablo">
        <Table
          head={["Rol", "Sınıf", "Kullanım"]}
          rows={[
            [
              "Başlık",
              <Code key="c">type-heading font-semibold</Code>,
              "Bölüm başlığı",
            ],
            [
              "Gövde",
              <Code key="c">type-body text-ink-body</Code>,
              "Liste, açıklama",
            ],
            ["Sayılar", <Code key="c">tabular-nums</Code>, "Sayaç, puan, süre"],
            [
              "Kırpma",
              <Code key="c">leading-crop</Code>,
              "Manşetin üst/alt boşluğu",
            ],
          ]}
        />
      </Section>
    </Page>
  );
}
