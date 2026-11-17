"use client";

import { useState } from "react";
import { Checkbox, Textarea } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Select } from "@/design/components/select";
import { Switch } from "@/design/components/switch";
import { Tooltip } from "@/design/components/tooltip";
import { Code, Label, Page, Section, Stage } from "../kit";

const SORTS = [
  { label: "Tarihe göre", value: "date" },
  { label: "Ada göre", value: "name" },
  { label: "Puana göre", value: "rating" },
  { label: "Popülerliğe göre", value: "popularity" },
  { label: "Süreye göre", value: "runtime" },
  { label: "Çıkış yılına göre", value: "year" },
];

const YEARS = Array.from({ length: 40 }, (_, i) => {
  const year = String(2026 - i);
  return { label: year, value: year };
});

export function FormsTab() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("date");
  const [year, setYear] = useState("2026");
  const [checks, setChecks] = useState({ a: true, b: false, c: true });
  const [switches, setSwitches] = useState({
    a: true,
    b: false,
    c: true,
    d: false,
  });
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [view, setView] = useState<"grid" | "list" | "poster">("grid");
  const [kind, setKind] = useState<"all" | "film" | "tv" | "short">("film");
  return (
    <Page
      eyebrow="5 Form ve kontroller"
      lead="Sayfada duran alanlar, select tetikleyicileri ve segmented rayı hafif camdır (liquid-control): bükecek bir şey yok, bu yüzden lens ve buz yok; ışıklı bir bevel ve kontür."
      source="design/recipes.ts · components/{input,select,switch,segmented-control,tooltip}.tsx"
      title="Form"
    >
      <Section
        note="sm · md · lg; card ve pill; bir alan odakta tek kez şişer."
        title="Metin alanı"
      >
        <Stage className="flex-col items-stretch">
          <div className="flex flex-wrap items-center gap-fib-2">
            <Input className="w-56" placeholder="sm" size="sm" />
            <Input className="w-64" placeholder="md (varsayılan)" />
            <Input className="w-72" placeholder="lg" size="lg" />
          </div>
          <div className="flex flex-wrap items-center gap-fib-2">
            <Input
              className="w-80"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Film, dizi, kişi ara…"
              shape="pill"
              value={query}
            />
            <Input className="w-56" disabled placeholder="Devre dışı" />
          </div>
          <Textarea
            className="max-w-xl"
            minHeight={120}
            placeholder="İncelemeni yaz…"
          />
        </Stage>
      </Section>

      <Section
        note="Menü kendi tetikleyicisinden açılır ve seçili seçeneğe kayar."
        title="Select"
      >
        <Stage>
          <Select
            ariaLabel="Sırala"
            className="w-48"
            onChange={(v) => setSort(String(v))}
            options={SORTS}
            value={sort}
          />
          <Select
            ariaLabel="Sırala"
            className="w-48"
            onChange={(v) => setSort(String(v))}
            options={SORTS}
            shape="pill"
            size="sm"
            value={sort}
          />
          <Select
            ariaLabel="Yıl"
            className="w-32"
            onChange={(v) => setYear(String(v))}
            options={YEARS}
            value={year}
          />
          <Select
            ariaLabel="Bölge"
            disabled
            onChange={() => {}}
            options={SORTS}
            placeholder={<Icon icon="solar:global-linear" size={14} />}
          />
        </Stage>
      </Section>

      <Section
        note="Tek boyut. Basılı tutup sürükle: knob cama döner."
        title="Switch"
      >
        <Stage>
          {(["a", "b"] as const).map((k) => (
            <label
              className="flex items-center gap-fib-2 type-control text-ink"
              key={k}
            >
              <Switch
                checked={switches[k]}
                onCheckedChange={(v) => setSwitches((s) => ({ ...s, [k]: v }))}
              />
              md {k === "a" ? "açık" : "kapalı"}
            </label>
          ))}
          {(["c", "d"] as const).map((k) => (
            <label
              className="flex items-center gap-fib-2 type-meta text-ink"
              key={k}
            >
              <Switch
                checked={switches[k]}
                onCheckedChange={(v) => setSwitches((s) => ({ ...s, [k]: v }))}
              />
              {k === "c" ? "Bildirimler" : "Spoiler gizle"}
            </label>
          ))}
          <label className="flex items-center gap-fib-2 type-control text-ink">
            <Switch checked disabled /> kilitli
          </label>
        </Stage>
      </Section>

      <Section title="Checkbox">
        <Stage>
          {(["a", "b", "c"] as const).map((k, i) => (
            <Checkbox
              checked={checks[k]}
              key={k}
              onCheckedChange={(v) => setChecks((s) => ({ ...s, [k]: v }))}
            >
              {["Spoiler içeriyor", "Yeniden izleme", "Herkese açık"][i]}
            </Checkbox>
          ))}
          <Checkbox checked disabled>
            Devre dışı
          </Checkbox>
        </Stage>
      </Section>

      <Section
        note="Metin, ikon, sayı; fit ve fill; devre dışı seçenek. Gösterge kaydırılırken cama döner."
        title="Segmented control"
      >
        <Stage className="flex-col items-start">
          <SegmentedControl
            ariaLabel="Aralık"
            items={[
              { key: "day", label: "Gün" },
              { key: "week", label: "Hafta" },
              { key: "month", label: "Ay" },
            ]}
            onChange={setRange}
            value={range}
          />
          <SegmentedControl
            ariaLabel="Görünüm"
            items={[
              { key: "grid", label: "Izgara", icon: "solar:widget-4-bold" },
              {
                key: "list",
                label: "Liste",
                icon: "solar:list-bold",
                count: 128,
              },
              {
                key: "poster",
                label: "Afiş",
                icon: "solar:gallery-bold",
                count: 12,
              },
            ]}
            onChange={setView}
            value={view}
          />
          <div className="w-full max-w-xl">
            <SegmentedControl
              ariaLabel="Tür"
              items={[
                { key: "all", label: "Hepsi" },
                { key: "film", label: "Film" },
                { key: "tv", label: "Dizi" },
                { key: "short", label: "Kısa", disabled: true },
              ]}
              onChange={setKind}
              value={kind}
              width="fill"
            />
          </div>
        </Stage>
      </Section>

      <Section note="TIP: buzlanmış cam. Dört yön." title="Tooltip">
        <Stage className="justify-center gap-fib-6 py-fib-6">
          {(["top", "right", "bottom", "left"] as const).map((position) => (
            <Tooltip
              key={position}
              position={position}
              text={`${position}: 2.4 milyon izlenme`}
            >
              <span className="flex cursor-help items-center gap-1.5 type-control font-medium text-ink tabular-nums">
                <Icon icon="solar:eye-bold" size={16} /> 2.4M
              </span>
            </Tooltip>
          ))}
        </Stage>
      </Section>

      <Section title="Bileşik form">
        <Stage className="max-w-xl flex-col items-stretch">
          <Label name="Liste oluştur" value="Bir formda tek primary" />
          <Input placeholder="Liste adı" />
          <Textarea minHeight={88} placeholder="Açıklama" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-fib-2 type-control text-ink">
              <Switch
                checked={switches.a}
                onCheckedChange={(v) => setSwitches((s) => ({ ...s, a: v }))}
              />
              Herkese açık
            </label>
            <Code>Switch + label</Code>
          </div>
        </Stage>
      </Section>
    </Page>
  );
}
