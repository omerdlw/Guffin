"use client";

import { useState } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Switch } from "@/design/components/switch";
import { cn } from "@/design/ui";
import { Code, Label, Page, Section, Stage, Table } from "../kit";

const TONES = [
  "neutral",
  "outline",
  "ghost",
  "chosen",
  "primary",
  "danger",
  "armed",
  "glass",
] as const;

const TOUCH = [
  ["Hover", "Fare kontrolü ≤ 2px imlece doğru eğer; cursor'ın camı onu sarar"],
  ["Bas", "Basılan noktaya ~4px verir, tek yumuşak salınımla döner"],
  ["Klavye", "Space ve Enter ortadan basar"],
  ["Alan", "Odakta tek yumuşak şişme; okunan ya da yazılan metin kıpırdamaz"],
] as const;

const STATES = [
  ["Dinlenme", "Metin ink-body; yüzey fill, halka edge"],
  ["Hover", "Metin ink; fill-hover, edge-hover"],
  ["Odak", "Hover görünümü focus-visible ile, artı global çizgi"],
  [
    "Seçili",
    "TONE.chosen: kağıt üstünde beyaz yaprak; görsel üstünde grade %15 dolgu, %25 halka",
  ],
  ["Devre dışı", "STATE.disabled: opacity-50, işaretçi yok, basma yok"],
  [
    "Meşgul",
    "STATE.busy: rengini korur, bekleme imleci, etiketin üstünde loader",
  ],
] as const;

export function InteractionTab() {
  const [busy, setBusy] = useState<string | null>(null);
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<"a" | "b" | "c">("b");
  return (
    <Page
      eyebrow="4 Etkileşim"
      lead="Kontroller hover, odak ve basmaya durum değişimiyle cevap verir. Cam kontroller bir de dokunuşla cevap verir: eğilir, basılır, salınır. Thumb'lar basıldığında ya da kaydırıldığında cama döner."
      source="design/liquid-touch.ts · components/glass-thumb.ts · docs/design/07-interaction.md"
      title="Etkileşim"
    >
      <Section
        note="Üstüne gel, bas, sekmeyle odakla. Her tone dinlenme, hover ve odak için tam bir cevap."
        title="Tone × durum"
      >
        <Stage className="grid grid-cols-[auto_repeat(3,auto)] gap-x-fib-4 gap-y-fib-3">
          <span />
          <span className="type-label text-ink-body">Dinlenme</span>
          <span className="type-label text-ink-body">Devre dışı</span>
          <span className="type-label text-ink-body">Meşgul</span>
          {TONES.map((tone) => (
            <div className="contents" key={tone}>
              <Code>{tone}</Code>
              <Button intent={tone} size="sm">
                Kaydet
              </Button>
              <Button disabled intent={tone} size="sm">
                Kaydet
              </Button>
              <Button
                disabled={busy === tone}
                intent={tone}
                loading={busy === tone}
                onClick={() => {
                  setBusy(tone);
                  setTimeout(() => setBusy(null), 1800);
                }}
                size="sm"
              >
                Bas
              </Button>
            </div>
          ))}
        </Stage>
        <Table head={["Durum", "Davranış"]} rows={STATES} />
      </Section>

      <Section
        note={
          <>
            Her <Code>.liquid-touch</Code> elemanı tek bir döngüden sürülür;
            yeni bir kontrol kendi pointer döngüsünü kurmaz.
          </>
        }
        title="Liquid touch"
      >
        <Stage caption="Büyük hedefler: kenarına yakın bas, eğilmeyi gör.">
          <Button className="h-24 w-56 type-title" shape="card">
            Kenarından bas
          </Button>
          <Button className="size-24" icon intent="glass" shape="pill">
            <Icon icon="solar:play-bold" size={34} />
          </Button>
          <Button
            className="h-24 w-56 type-title"
            intent="primary"
            shape="pill"
          >
            Birincil
          </Button>
          <Input className="w-72" placeholder="Odakla: tek şişme" size="lg" />
        </Stage>
        <Table head={["Dokunuş", "Cevap"]} rows={TOUCH} />
      </Section>

      <Section
        note="Dinlenirken katı; basılınca, sürüklenince ya da yeni seçime geçerken berrak cama şişer, altındakini kenarında büker ve yeniden katılaşır."
        title="Cama dönen thumb'lar"
      >
        <Stage>
          <SegmentedControl
            ariaLabel="Thumb"
            items={[
              { key: "a", label: "Filmler" },
              { key: "b", label: "Diziler" },
              { key: "c", label: "Kişiler" },
            ]}
            onChange={setSeg}
            value={seg}
          />
          <Switch checked={on} onCheckedChange={setOn} />
          <Label name="Bas ve sürükle" value="glass-thumb.ts: yay + mandal" />
        </Stage>
      </Section>

      <Section
        note="Cursor imleci işaretler ve bir kontrolün şeklini sarar; kontrolün kendi takip eden ışığı yoktur."
        title="Cursor"
      >
        <Stage>
          {["card", "pill", "thumb"].map((shape) => (
            <Button
              className={cn("min-w-32")}
              key={shape}
              shape={shape as "card" | "pill" | "thumb"}
            >
              shape=&quot;{shape}&quot;
            </Button>
          ))}
          <a className="type-control text-ink underline" href="#interaction">
            Bağlantı
          </a>
        </Stage>
      </Section>
    </Page>
  );
}
