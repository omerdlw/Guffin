"use client";

import { type JSX, useEffect, useState } from "react";
import { Icon } from "@/design/components/icon";
import { Logo } from "@/design/components/logo";
import { SegmentedControl } from "@/design/components/segmented-control";
import { SHELL } from "@/design/foundations/layers";
import { TONE, WELL } from "@/design/foundations/tones";
import { grade as pageGrade, type Tint, useGrade } from "@/design/grade";
import { cn } from "@/design/ui";
import { GlassLab } from "./glass-lab";
import { ButtonsTab } from "./tabs/buttons";
import { ColourTab } from "./tabs/colour";
import { FormsTab } from "./tabs/forms";
import { GlassTab } from "./tabs/glass";
import { InteractionTab } from "./tabs/interaction";
import { LayersTab } from "./tabs/layers";
import { MediaTab } from "./tabs/media";
import { MovementTab } from "./tabs/movement";
import { OverviewTab } from "./tabs/overview";
import { ShapeTab } from "./tabs/shape";
import { TypeTab } from "./tabs/type";

// The UI lab: the Guffin design system from its tokens to its glass, laid on
// Apple's Tahoe wallpaper, where liquid glass looks its best. Every tab reads
// its values from the source and from what the browser paints now, so the
// grade and the backdrop switches below change every reading.

const TABS = [
  {
    key: "overview",
    label: "Genel bakış",
    icon: "solar:home-smile-bold",
    group: "Sistem",
  },
  {
    key: "colour",
    label: "Renk",
    icon: "solar:palette-round-bold",
    group: "Temeller",
  },
  {
    key: "type",
    label: "Tipografi",
    icon: "solar:text-bold",
    group: "Temeller",
  },
  {
    key: "shape",
    label: "Şekil ve boşluk",
    icon: "solar:ruler-angular-bold",
    group: "Temeller",
  },
  {
    key: "motion",
    label: "Hareket",
    icon: "solar:play-stream-bold",
    group: "Davranış",
  },
  {
    key: "interaction",
    label: "Etkileşim",
    icon: "solar:cursor-bold",
    group: "Davranış",
  },
  {
    key: "glass",
    label: "Liquid Glass",
    icon: "solar:waterdrop-bold",
    group: "Malzeme",
  },
  {
    key: "webgl",
    label: "WebGL cam",
    icon: "solar:magic-stick-3-bold",
    group: "Malzeme",
  },
  {
    key: "buttons",
    label: "Butonlar",
    icon: "solar:cursor-square-bold",
    group: "Component'ler",
  },
  {
    key: "forms",
    label: "Form",
    icon: "solar:checklist-minimalistic-bold",
    group: "Component'ler",
  },
  {
    key: "layers",
    label: "Katmanlar",
    icon: "solar:layers-bold",
    group: "Component'ler",
  },
  {
    key: "media",
    label: "Medya",
    icon: "solar:gallery-bold",
    group: "Component'ler",
  },
] as const;

type Tab = (typeof TABS)[number]["key"];

const GROUPS = [...new Set(TABS.map((t) => t.group))];

/** Grades to try: the hues a picture might give a page. */
const GRADES: { name: string; tint: Tint | null }[] = [
  { name: "Yok", tint: null },
  { name: "Kızıl", tint: { l: 0.74, c: 0.12, h: 25 } },
  { name: "Kehribar", tint: { l: 0.78, c: 0.12, h: 70 } },
  { name: "Yeşil", tint: { l: 0.76, c: 0.12, h: 150 } },
  { name: "Mavi", tint: { l: 0.74, c: 0.11, h: 240 } },
  { name: "Mor", tint: { l: 0.72, c: 0.12, h: 305 } },
];

const BACKDROPS = [
  { key: "wallpaper", label: "Tahoe" },
  { key: "veil", label: "Perde" },
  { key: "page", label: "Sayfa" },
] as const;

type Backdrop = (typeof BACKDROPS)[number]["key"];

const isTab = (value: string): value is Tab =>
  TABS.some((t) => t.key === value);

function useTab(): [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => {
    const read = () => {
      const hash = location.hash.slice(1);
      if (isTab(hash)) setTab(hash);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const choose = (next: Tab) => {
    history.replaceState(null, "", `#${next}`);
    setTab(next);
    window.scrollTo({ top: 0 });
  };
  return [tab, choose];
}

function Content({ tab, wallpaper }: { tab: Tab; wallpaper: string }) {
  switch (tab) {
    case "overview":
      return <OverviewTab />;
    case "colour":
      return <ColourTab />;
    case "type":
      return <TypeTab />;
    case "shape":
      return <ShapeTab />;
    case "motion":
      return <MovementTab />;
    case "interaction":
      return <InteractionTab />;
    case "glass":
      return <GlassTab wallpaper={wallpaper} />;
    case "buttons":
      return <ButtonsTab />;
    case "forms":
      return <FormsTab />;
    case "layers":
      return <LayersTab />;
    case "media":
      return <MediaTab wallpaper={wallpaper} />;
    case "webgl":
      return null;
  }
}

function Settings({
  backdrop,
  setBackdrop,
  grade,
  setGrade,
}: {
  backdrop: Backdrop;
  setBackdrop: (b: Backdrop) => void;
  grade: number;
  setGrade: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-fib-3">
      <div className="flex flex-col gap-fib-1">
        <span className={cn(TONE.label, "px-fib-1 text-ink-body")}>
          Arka plan
        </span>
        <SegmentedControl
          ariaLabel="Arka plan"
          items={BACKDROPS}
          onChange={setBackdrop}
          value={backdrop}
          width="fill"
        />
      </div>
      <div className="flex flex-col gap-fib-2">
        <span className={cn(TONE.label, "px-fib-1 text-ink-body")}>
          Grade · {GRADES[grade]!.name}
        </span>
        <div className="flex gap-fib-2 px-fib-1">
          {GRADES.map((g, i) => (
            <button
              aria-label={g.name}
              aria-pressed={grade === i}
              className={cn(
                "size-control-xs cursor-pointer rounded-full ring-1 ring-edge-hover ring-inset",
                grade === i && "outline-2 outline-offset-2 outline-ink",
              )}
              key={g.name}
              onClick={() => setGrade(i)}
              style={{
                background: g.tint
                  ? `oklch(${g.tint.l} ${g.tint.c} ${g.tint.h})`
                  : "repeating-linear-gradient(135deg, var(--ink-faint) 0 2px, transparent 2px 5px)",
              }}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function UiLab({ wallpaper }: { wallpaper: string }): JSX.Element {
  const [tab, setTab] = useTab();
  const [backdrop, setBackdrop] = useState<Backdrop>("wallpaper");
  const [grade, setGrade] = useState(0);
  useGrade(GRADES[grade]!.tint);
  // Leaving the lab hands the page back ungraded.
  useEffect(() => () => pageGrade.set(null), []);

  const settings = (
    <Settings
      backdrop={backdrop}
      grade={grade}
      setBackdrop={setBackdrop}
      setGrade={setGrade}
    />
  );

  return (
    <>
      {tab !== "webgl" && backdrop !== "wallpaper" ? (
        <div
          aria-hidden
          className={cn(
            "fixed inset-0",
            backdrop === "page"
              ? "bg-page"
              : backdrop === "veil"
                ? "bg-veil"
                : "bg-dim",
          )}
        />
      ) : null}
      {tab === "webgl" ? <GlassLab src={wallpaper} /> : null}

      <aside
        className={cn(
          SHELL,
          "fixed top-fib-4 bottom-fib-4 left-fib-4 z-10 hidden w-64 flex-col gap-fib-4 overflow-y-auto rounded-shell p-fib-3 lg:flex",
        )}
      >
        <div className="flex items-center gap-fib-2 px-fib-2 pt-fib-1 text-ink">
          <Logo size={26} />
          <span className="flex flex-col">
            <strong className="type-title leading-5 font-semibold">
              UI Lab
            </strong>
            <span className="type-label text-ink-body">
              Guffin Design System
            </span>
          </span>
        </div>
        <nav className="flex flex-col gap-fib-2">
          {GROUPS.map((group) => (
            <div className="flex flex-col gap-0.5" key={group}>
              <span className={cn(TONE.label, "px-fib-2 pb-1 text-ink-muted")}>
                {group}
              </span>
              {TABS.filter((t) => t.group === group).map((t) => (
                <button
                  aria-current={tab === t.key ? "page" : undefined}
                  className={cn(
                    "flex h-control-sm cursor-pointer items-center gap-fib-2 rounded-full px-fib-3 type-control",
                    tab === t.key
                      ? cn(WELL, "font-medium text-ink")
                      : "text-ink-body hover:bg-fill-lift hover:text-ink",
                  )}
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  type="button"
                >
                  <Icon icon={t.icon} size={16} />
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-rule pt-fib-3">{settings}</div>
      </aside>

      {/* Phones and tablets: the tabs scroll along the top. */}
      <nav className="sticky top-0 z-10 flex gap-fib-1 overflow-x-auto px-fib-4 py-fib-3 lg:hidden">
        {TABS.map((t) => (
          <button
            className={cn(
              "flex h-control-sm shrink-0 cursor-pointer items-center gap-fib-1 rounded-full px-fib-3 type-meta",
              tab === t.key ? cn(SHELL, "text-ink") : "text-ink-lead",
            )}
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
          >
            <Icon icon={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </nav>

      <main
        className="relative px-fib-4 pt-fib-5 pb-[calc(var(--spacing-dock-shelf)+var(--spacing-fib-6))] lg:pt-fib-6 lg:pr-fib-6 lg:pl-[calc(16rem+var(--spacing-fib-4)*2+var(--spacing-fib-5))]"
        id="main"
      >
        <div className="mx-auto max-w-5xl">
          {tab === "webgl" ? null : <Content tab={tab} wallpaper={wallpaper} />}
          <div
            className={cn("mt-fib-6 lg:hidden", tab === "webgl" && "hidden")}
          >
            <div className={cn(SHELL, "rounded-shell p-fib-4")}>{settings}</div>
          </div>
        </div>
      </main>
    </>
  );
}
