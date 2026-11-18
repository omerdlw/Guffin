"use client";

import { type CSSProperties, useRef, useState } from "react";
import { animate } from "@/motion/lib";
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Switch } from "@/design/components/switch";
import { FLOAT, GLASS, SHELL, TIP } from "@/design/foundations/layers";
import { WELL, WELL_HOVER } from "@/design/foundations/tones";
import { beat, SETTLE, tween } from "@/design/theme/motion";
import { cn } from "@/design/ui";
import {
  Code,
  Label,
  Page,
  PATTERN_ICONS,
  Section,
  Stage,
  PANEL,
  useDrag,
  useVar,
} from "../kit";

const MATERIALS = [
  {
    name: "SHELL",
    classes: SHELL,
    code: "liquid liquid-lens",
    note: "Modal, menü, select, toast",
  },
  {
    name: "FLOAT",
    classes: FLOAT,
    code: "liquid liquid-flat liquid-lens",
    note: "Dock kontrolleri",
  },
  {
    name: "TIP",
    classes: TIP,
    code: "liquid liquid-lens liquid-tip",
    note: "Tooltip, komut ipucu",
  },
  {
    name: "GLASS",
    classes: GLASS,
    code: "liquid liquid-flat liquid-lens",
    note: "Dock durum kartı",
  },
  {
    name: "CLEAR",
    classes: "liquid liquid-flat liquid-clear",
    code: "liquid-clear",
    note: "Buzsuz lens: su damlası",
  },
  {
    name: "PRISM",
    classes: "liquid liquid-flat liquid-clear liquid-prism",
    code: "liquid-clear liquid-prism",
    note: "Görsel üstü: renkler ayrışır",
  },
  {
    name: "FLUID",
    classes: "liquid liquid-flat liquid-lens liquid-fluid",
    code: "liquid-fluid",
    note: "Her karede şekil değiştiren",
  },
  {
    name: "FROST",
    classes: "liquid liquid-flat liquid-frost",
    code: "liquid-frost",
    note: "Yalnız buzlanma",
  },
] as const;

const FORMS = [
  { name: "Pill", cls: "h-16 w-72 rounded-full" },
  { name: "Daire", cls: "size-32 rounded-full" },
  { name: "Kapsül dikey", cls: "h-40 w-20 rounded-full" },
  { name: "Kart", cls: "h-32 w-48 rounded-card" },
  { name: "Panel", cls: "h-40 w-64 rounded-panel" },
  { name: "Kabuk", cls: "h-44 w-80 rounded-shell" },
  { name: "Mini", cls: "size-control-sm rounded-full" },
  { name: "Çip", cls: "h-control-xs w-24 rounded-full" },
] as const;

const TOKENS = [
  "--liquid-tint",
  "--liquid-tint-hover",
  "--liquid-tint-dock",
  "--liquid-contour",
  "--liquid-shadow",
  "--liquid-frost",
  "--liquid-lens-tone",
  "--liquid-well",
  "--liquid-well-shadow",
  "--glass-control",
  "--glass-control-bevel",
  "--glass-control-contour",
] as const;

function Pattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col justify-center gap-fib-4 overflow-hidden px-fib-5 text-ink",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-fib-5">
        {PATTERN_ICONS.map((icon) => (
          <Icon icon={icon} key={icon} size={40} />
        ))}
      </div>
      <span className="font-zuume type-display-lg leading-crop font-bold uppercase">
        Guffin Liquid Glass
      </span>
      <div className="flex h-fib-4 gap-fib-2">
        {Array.from({ length: 40 }, (_, i) => (
          <span className="w-fib-2 shrink-0 rounded-mark bg-ink" key={i} />
        ))}
      </div>
    </div>
  );
}

function Swatch({ name, classes, code, note }: (typeof MATERIALS)[number]) {
  const ref = useDrag<HTMLDivElement>();
  return (
    <div
      className={cn(
        classes,
        "flex h-28 w-44 cursor-grab touch-none flex-col justify-end rounded-panel p-fib-3 select-none active:cursor-grabbing",
      )}
      ref={ref}
    >
      <strong className="type-control font-semibold text-ink">{name}</strong>
      <span className="truncate type-label text-ink-lead">{note}</span>
      <span className="truncate [font-family:ui-monospace,monospace] text-[length:9px] text-ink-body">
        {code}
      </span>
    </div>
  );
}

function Tuner() {
  const [bezel, setBezel] = useState(22);
  const [bend, setBend] = useState(1);
  const [kind, setKind] = useState<"lens" | "clear" | "prism">("lens");
  const classes = {
    lens: "liquid liquid-flat liquid-lens",
    clear: "liquid liquid-flat liquid-clear",
    prism: "liquid liquid-flat liquid-clear liquid-prism",
  }[kind];
  const vars = {
    "--liquid-bezel": `${bezel}px`,
    "--liquid-bend": String(bend),
  } as CSSProperties;
  const key = `${kind}-${bezel}-${bend}`;
  return (
    <div className="flex flex-col gap-fib-3">
      <Stage className="min-h-80 justify-center overflow-hidden">
        <Pattern />
        <div
          className={cn(classes, "h-20 w-80 rounded-full")}
          key={`a${key}`}
          style={vars}
        />
        <div
          className={cn(classes, "size-44 rounded-full")}
          key={`b${key}`}
          style={vars}
        />
        <div
          className={cn(classes, "h-36 w-56 rounded-shell")}
          key={`c${key}`}
          style={vars}
        />
      </Stage>
      <div className="flex flex-wrap items-end gap-fib-5">
        <SegmentedControl
          ariaLabel="Lens türü"
          items={[
            { key: "lens", label: "lens" },
            { key: "clear", label: "clear" },
            { key: "prism", label: "prism" },
          ]}
          onChange={setKind}
          value={kind}
        />
        <Slider
          label="--liquid-bezel"
          max={60}
          min={6}
          onChange={setBezel}
          step={1}
          unit="px"
          value={bezel}
        />
        <Slider
          label="--liquid-bend"
          max={3}
          min={0}
          onChange={setBend}
          step={0.05}
          unit="×"
          value={bend}
        />
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex w-56 flex-col gap-fib-1">
      <span className="flex justify-between type-meta">
        <Code>{label}</Code>
        <span className="text-ink tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        className="accent-(--primary)"
        max={max}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function Forms() {
  return (
    <Stage className="min-h-72 items-center overflow-hidden">
      <Pattern />
      {FORMS.map((f) => (
        <div
          className="relative flex flex-col items-center gap-fib-2"
          key={f.name}
        >
          <div className={cn("liquid liquid-lens", f.cls)} />
          <span className="type-label font-semibold text-ink">{f.name}</span>
        </div>
      ))}
    </Stage>
  );
}

function Backgrounds({ wallpaper }: { wallpaper: string }) {
  const lens =
    "liquid liquid-flat liquid-lens absolute top-1/2 left-1/2 h-16 w-52 -translate-1/2 rounded-full";
  return (
    <div className="grid gap-fib-3 sm:grid-cols-2 lg:grid-cols-4">
      <figure className="flex flex-col gap-fib-2">
        <div className="relative grid h-40 place-items-center overflow-hidden rounded-sheet ring-1 ring-edge-hover ring-inset">
          <p className="px-fib-4 type-copy font-semibold text-ink">
            Metnin üstünde kenarda harfler bükülür ama harf kalır.
          </p>
          <div className={lens} />
        </div>
        <Label name="Metin" value="Cam metin üstünde: büküm hafif" />
      </figure>
      <figure className="flex flex-col gap-fib-2">
        <div className="relative grid h-40 place-items-center overflow-hidden rounded-sheet ring-1 ring-edge-hover ring-inset">
          <div className="flex gap-fib-3 text-ink">
            {PATTERN_ICONS.slice(0, 5).map((icon) => (
              <Icon icon={icon} key={icon} size={32} />
            ))}
          </div>
          <div className={lens} />
        </div>
        <Label name="İkon" value="Kontrastlı şekiller" />
      </figure>
      <figure className="flex flex-col gap-fib-2">
        <div
          className="relative h-40 overflow-hidden rounded-sheet bg-cover bg-center ring-1 ring-edge-hover ring-inset"
          style={{
            backgroundImage: `url(${wallpaper})`,
            backgroundSize: "400%",
          }}
        >
          <div className={cn(lens, "liquid-prism")} />
        </div>
        <Label name="Görsel" value="liquid-prism: renkler ayrışır" />
      </figure>
      <figure className="flex flex-col gap-fib-2">
        <div className="relative h-40 overflow-hidden rounded-sheet bg-page ring-1 ring-edge-hover ring-inset">
          <div className={lens} />
        </div>
        <Label name="Düz sayfa" value="Bükecek bir şey yok" />
      </figure>
    </div>
  );
}

function GlassOnGlass() {
  return (
    <Stage>
      <div
        className={cn(
          SHELL,
          "flex w-80 flex-col gap-fib-2 rounded-shell p-fib-3",
        )}
      >
        <span className="px-fib-2 type-label font-semibold text-ink-body uppercase">
          Cam içinde: WELL
        </span>
        <button
          className={cn(
            WELL,
            WELL_HOVER,
            "flex h-control-md items-center gap-fib-2 rounded-panel px-fib-3 type-control text-ink",
          )}
          type="button"
        >
          <Icon icon="solar:bookmark-bold" size={16} /> İzlenecekler
        </button>
        <button
          className={cn(
            WELL,
            WELL_HOVER,
            "flex h-control-md items-center gap-fib-2 rounded-panel px-fib-3 type-control text-ink",
          )}
          type="button"
        >
          <Icon icon="solar:heart-bold" size={16} /> Beğenilenler
        </button>
        <div className="flex gap-fib-2">
          <Button intent="neutral" size="sm" width="fill">
            neutral
          </Button>
          <Button intent="primary" size="sm" width="fill">
            primary
          </Button>
        </div>
      </div>
      <div className="flex w-72 flex-col gap-fib-2">
        <span className="type-label font-semibold text-ink-body uppercase">
          Sayfada: liquid-control
        </span>
        <Button intent="neutral" width="full">
          neutral
        </Button>
        <Button intent="outline" width="full">
          outline
        </Button>
        <Button intent="glass" shape="pill" width="full">
          glass (resim üstü)
        </Button>
      </div>
    </Stage>
  );
}

function Resize() {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    const next = !wide;
    setWide(next);
    animate(
      el,
      { width: next ? 480 : 160, height: next ? 200 : 64 },
      tween(beat(0), SETTLE),
    );
  };
  return (
    <Stage
      className="min-h-64 overflow-hidden"
      caption="Boyut değişirken lens boyuttan bağımsız buzlanmaya devreder; durunca yeniden çizilir. Parlama dokuz dilimle her karede aynı kalır."
    >
      <Pattern />
      <div
        className="liquid liquid-lens relative h-16 w-40 rounded-shell"
        ref={ref}
      />
      <Button
        className="relative"
        intent="primary"
        onClick={toggle}
        shape="pill"
      >
        {wide ? "Daralt" : "Genişlet"}
      </Button>
    </Stage>
  );
}

function TokenRow({ name }: { name: string }) {
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

function Tokens() {
  return (
    <div className={cn(PANEL, "flex flex-col")}>
      {TOKENS.map((name) => (
        <TokenRow key={name} name={name} />
      ))}
    </div>
  );
}

export function GlassTab({ wallpaper }: { wallpaper: string }) {
  const [on, setOn] = useState(true);
  const [range, setRange] = useState<"day" | "week" | "month" | "year">("week");
  return (
    <Page
      eyebrow="10 Liquid glass"
      lead="Yüzen her şey için tek malzeme. Her .liquid yüzey dar kenarlı bir cam levhadır (iOS 26.5 tarifi): kenarda sahneyi güçlüce içeri çeken bir lens ve sol üst ile sağ alttan yanan, sahnenin kendi rengindeki kenar ışığı. İkisi de yalnız köşe yarıçapı ve kenar genişliğine bağlıdır; dokuz dilim olarak bir kez çizilir."
      source="styles/liquid.css · design/glass/ · docs/design/09-glass.md"
      title="Liquid Glass"
    >
      <Section
        note="Sekiz malzeme. Hepsini sürükle: desenin, ikonların, birbirinin üstüne getir."
        title="Malzemeler"
      >
        <Stage className="min-h-96 content-start">
          <Pattern />
          {MATERIALS.map((m) => (
            <Swatch key={m.name} {...m} />
          ))}
        </Stage>
      </Section>

      <Section
        note={
          <>
            Bir yüzey kendi kenar genişliğini (<Code>--liquid-bezel</Code>) ve
            kırılma gücünü (<Code>--liquid-bend</Code>) isteyebilir.
            Bezel&apos;i yarıçapa yaklaştır, büküm&apos;ü artır: kubbe lense
            döner.
          </>
        }
        title="Lens ayarı"
      >
        <Tuner />
      </Section>

      <Section
        note="Lens yalnız köşe yarıçapına bağlı: her form, her boyut aynı kenar."
        title="Formlar"
      >
        <Forms />
      </Section>

      <Section note="Aynı lens, dört zemin." title="Ne üstünde">
        <Backgrounds wallpaper={wallpaper} />
      </Section>

      <Section
        note="Camın üstünde cam yok. Bir katmanın içindeki kontrol bir WELL'dir; sayfadaki kontrol hafif cam (liquid-control)."
        title="Cam üstünde cam"
      >
        <GlassOnGlass />
      </Section>

      <Section title="Boyut değişimi">
        <Resize />
      </Section>

      <Section
        note="Switch ve segmented göstergesi, bastığında cama döner."
        title="Cam thumb'lar"
      >
        <Stage className="overflow-hidden">
          <Pattern className="opacity-40" />
          <Switch checked={on} onCheckedChange={setOn} />
          <SegmentedControl
            ariaLabel="Thumb"
            items={[
              { key: "day", label: "Gün" },
              { key: "week", label: "Hafta" },
              { key: "month", label: "Ay" },
              { key: "year", label: "Yıl" },
            ]}
            onChange={setRange}
            value={range}
          />
        </Stage>
      </Section>

      <Section
        note="Canlı değerler; grade değişince güncellenir."
        title="Token'lar"
      >
        <Tokens />
      </Section>
    </Page>
  );
}
