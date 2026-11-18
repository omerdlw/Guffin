"use client";

import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import {
  Code,
  Page,
  PANEL,
  Section,
  shortColour,
  useColour,
  useVar,
} from "../kit";

type Role = { name: string; note: string };

const INK: Role[] = [
  { name: "--ink", note: "Başlık, en güçlü metin" },
  { name: "--ink-lead", note: "Öne çıkan metin" },
  { name: "--ink-body", note: "Gövde; kontrolün dinlenme hali" },
  { name: "--ink-muted", note: "İkincil bilgi" },
  { name: "--ink-faint", note: "İpucu, devre dışı iz" },
];

const SURFACE: Role[] = [
  { name: "--page", note: "Sayfa; görselin rengini izler" },
  { name: "--plate", note: "Katı zemin (azaltılmış şeffaflık)" },
  { name: "--glass", note: "Opak cam yerine" },
  { name: "--fill", note: "Duran yüzey" },
  { name: "--fill-hover", note: "Üstüne gelinmiş" },
  { name: "--fill-active", note: "Basılı" },
  { name: "--fill-lift", note: "Cam üstündeki vurgu" },
  { name: "--edge", note: "Halka, dinlenme" },
  { name: "--edge-hover", note: "Halka, hover" },
  { name: "--edge-focus", note: "Halka, odak" },
  { name: "--rule", note: "Ayırıcı çizgi" },
  { name: "--line", note: "Belirgin çizgi" },
];

const STATE: Role[] = [
  { name: "--primary", note: "Tek gönder aksiyonu" },
  { name: "--primary-hover", note: "Birincil, hover" },
  { name: "--on-primary", note: "Birincil üstü metin" },
  { name: "--chosen", note: "Seçili dolgu (grade)" },
  { name: "--chosen-edge", note: "Seçili halka" },
  { name: "--chosen-ink", note: "Seçili metin" },
  { name: "--focus-ring", note: "Odak çizgisi" },
  { name: "--selection", note: "Metin seçimi" },
];

const MEANING: Role[] = [
  { name: "--watched", note: "İzlendi" },
  { name: "--listed", note: "Listede" },
  { name: "--liked", note: "Beğenildi" },
  { name: "--rated", note: "Puanlı yıldız" },
  { name: "--rated-off", note: "Sönük yıldız" },
  { name: "--danger", note: "Tehlike" },
  { name: "--award", note: "Ödül" },
];

const LAYERS: Role[] = [
  { name: "--veil", note: "Dock/modal arkasındaki perde" },
  { name: "--dim", note: "Alttaki modal" },
  { name: "--liquid-tint", note: "Camın tonu" },
  { name: "--liquid-tint-hover", note: "Cam, hover" },
  { name: "--liquid-tint-dock", note: "Dock kartlarının tonu" },
  { name: "--liquid-contour", note: "Kenarın dışındaki kıl çizgi" },
  { name: "--liquid-well", note: "Cam içindeki kontrol" },
  { name: "--glass-control", note: "Sayfadaki cam kontrol" },
];

const EFFECTS = [
  "--liquid-frost",
  "--liquid-lens-tone",
  "--liquid-shadow",
  "--lift",
  "--glass-control-bevel",
  "--rim-key",
  "--rim-fill",
  "--rim-shade",
] as const;

function Swatch({ role }: { role: Role }) {
  const value = useColour(role.name);
  return (
    <div className={cn(PANEL, "flex items-center gap-fib-3 p-fib-2 pr-fib-3")}>
      <span
        className="size-control-lg shrink-0 rounded-tile ring-1 ring-edge-hover ring-inset"
        style={{
          backgroundImage: `linear-gradient(var(${role.name}), var(${role.name})), repeating-conic-gradient(var(--fill-active) 0 25%, transparent 0 50%)`,
          backgroundSize: "auto, 10px 10px",
        }}
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate type-control font-medium text-ink">
          {role.name.slice(2)}
        </span>
        <span className="truncate type-label text-ink-body">{role.note}</span>
        <span className="truncate [font-family:ui-monospace,monospace] text-[length:10px] text-ink-muted">
          {shortColour(value)}
        </span>
      </span>
    </div>
  );
}

function Swatches({ roles }: { roles: Role[] }) {
  return (
    <div className="grid gap-fib-2 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => (
        <Swatch key={role.name} role={role} />
      ))}
    </div>
  );
}

function Effect({ name }: { name: string }) {
  const value = useVar(name);
  return (
    <div className="flex flex-col gap-fib-1 border-b border-rule px-fib-4 py-fib-3 last:border-0">
      <Code>{name}</Code>
      <span className="[font-family:ui-monospace,monospace] type-label break-all text-ink-lead">
        {value || "—"}
      </span>
    </div>
  );
}

export function ColourTab() {
  return (
    <Page
      eyebrow="3.1 · 3.2 Renk"
      lead={
        <>
          Mürekkep tek renktir, siyaha yakın: her basamak aynı siyahın daha
          düşük opaklığıdır, ayrı bir gri değil. Etiket altındakini geçirir;
          dolguya, cama ya da görsele baskı gibi oturur. Sayfa rengi görseli
          izler (<Code>--ambient-page</Code>). Aşağıdaki değerler tarayıcının şu
          an boyadığı değerlerdir; grade&apos;i değiştir, hepsi değişir.
        </>
      }
      source="styles/themes.css · docs/design/03-colour.md"
      title="Renk"
    >
      <Section
        note="Tek siyah, beş opaklık (100 · 88 · 74 · 56 · 32); kontroller dinlenirken bile ink-body'den sönük olmaz."
        title="Mürekkep"
      >
        <div className={cn(PANEL, "flex flex-col gap-fib-2 p-fib-5")}>
          {INK.map((role) => (
            <div className="flex items-baseline gap-fib-4" key={role.name}>
              <span
                className="type-heading font-semibold"
                style={{ color: `var(${role.name})` }}
              >
                Sinema bir aynadır.
              </span>
              <Code>{`text-${role.name.slice(2)}`}</Code>
            </div>
          ))}
        </div>
        <Swatches roles={INK} />
      </Section>

      <Section title="Yüzey, kenar, çizgi">
        <Swatches roles={SURFACE} />
      </Section>

      <Section
        note="Grade, sayfanın görselinden çıkan renk: seçili durumu boyar, bir gönder aksiyonunu asla. Kenar çubuğundaki Grade seçicisiyle dene."
        title="Durum ve seçim"
      >
        <div className="flex flex-wrap items-center gap-fib-2">
          <Button intent="primary">Kaydet</Button>
          <Button intent="chosen">Seçili</Button>
          <span
            className={cn(
              TONE.chosen,
              "rounded-full px-fib-3 py-fib-1 type-control",
            )}
          >
            TONE.chosen
          </span>
          <span className="rounded-mark bg-(--selection) px-1 type-body text-ink">
            seçili metin
          </span>
        </div>
        <Swatches roles={STATE} />
      </Section>

      <Section title="Anlam renkleri">
        <div className="flex flex-wrap gap-fib-4 type-control">
          <span className="flex items-center gap-fib-1 text-watched">
            <Icon icon="solar:eye-bold" size={18} /> İzlendi
          </span>
          <span className="flex items-center gap-fib-1 text-listed">
            <Icon icon="solar:list-check-bold" size={18} /> Listede
          </span>
          <span className="flex items-center gap-fib-1 text-liked">
            <Icon icon="solar:heart-bold" size={18} /> Beğenildi
          </span>
          <span className="flex items-center gap-0.5 text-rated">
            {[0, 1, 2, 3].map((i) => (
              <Icon icon="solar:star-bold" key={i} size={18} />
            ))}
            <Icon className="text-rated-off" icon="solar:star-bold" size={18} />
          </span>
          <span className="flex items-center gap-fib-1 text-danger">
            <Icon icon="solar:danger-triangle-bold" size={18} /> Tehlike
          </span>
          <span className="flex items-center gap-fib-1 text-award">
            <Icon icon="solar:cup-star-bold" size={18} /> Ödül
          </span>
        </div>
        <Swatches roles={MEANING} />
      </Section>

      <Section title="Katman ve cam renkleri">
        <Swatches roles={LAYERS} />
      </Section>

      <Section
        note="Renk olmayan değerler: buzlanma, lens tonu, gölgeler, bevel, karışım modu."
        title="Efektler"
      >
        <div className={cn(PANEL, "flex flex-col p-0")}>
          {EFFECTS.map((name) => (
            <Effect key={name} name={name} />
          ))}
        </div>
      </Section>
    </Page>
  );
}
