"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";

export const PANEL = "liquid liquid-flat liquid-frost rounded-sheet";

function subscribeGrade(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributeFilter: ["style"],
    attributes: true,
  });
  return () => observer.disconnect();
}

export function useGradeKey(): string {
  return useSyncExternalStore(
    subscribeGrade,
    () => {
      const { style } = document.documentElement;
      return `${style.getPropertyValue("--ambient-vibrant")}|${style.getPropertyValue("--ambient-page")}`;
    },
    () => "",
  );
}

export function useColour(name: string): string {
  const grade = useGradeKey();
  const [value, setValue] = useState("");
  useEffect(() => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    probe.style.display = "none";
    document.body.append(probe);
    setValue(getComputedStyle(probe).color);
    probe.remove();
  }, [name, grade]);
  return value;
}

export function useVar(name: string): string {
  const grade = useGradeKey();
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(
      getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    );
  }, [name, grade]);
  return value;
}

export function shortColour(value: string): string {
  return value
    .replace(/(\d+\.\d{3})\d+/g, "$1")
    .replace(/^color\(srgb /, "srgb(");
}

export function useDrag<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: [number, number, number, number] | null = null;
    let at: [number, number] = [0, 0];
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest("button, input, a, select")) return;
      start = [e.clientX, e.clientY, at[0], at[1]];
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      at = [start[2] + e.clientX - start[0], start[3] + e.clientY - start[1]];
      el.style.translate = `${at[0]}px ${at[1]}px`;
    };
    const up = () => {
      start = null;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);
  return ref;
}

export function Page({
  eyebrow,
  title,
  lead,
  source,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  source?: string;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-fib-6">
      <header className="flex flex-col gap-fib-3">
        <span className={cn(TONE.label, "text-ink-body")}>{eyebrow}</span>
        <h1 className="font-zuume type-display-lg leading-crop font-bold text-ink uppercase sm:type-display-xl">
          {title}
        </h1>
        <p className="max-w-[62ch] type-copy text-pretty text-ink-lead">
          {lead}
        </p>
        {source ? (
          <span className="type-meta text-ink-body">
            Kaynak: <Code>{source}</Code>
          </span>
        ) : null}
      </header>
      {children}
    </article>
  );
}

export function Section({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-fib-3", className)}>
      <header className="flex flex-col gap-fib-1">
        <h2 className="type-heading font-semibold text-ink">{title}</h2>
        {note ? (
          <p className="max-w-[72ch] type-body text-pretty text-ink-lead">
            {note}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function Stage({
  children,
  className,
  caption,
  style,
}: {
  children: ReactNode;
  className?: string;
  caption?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <figure className="flex flex-col gap-fib-2">
      <div
        className={cn(
          "relative flex flex-wrap items-center gap-fib-3 rounded-sheet p-fib-4 ring-1 ring-edge-hover ring-inset",
          className,
        )}
        style={style}
      >
        {children}
      </div>
      {caption ? (
        <figcaption className="px-fib-2 type-meta text-ink-body">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-mark bg-fill px-1 py-px [font-family:ui-monospace,monospace] text-[0.92em] text-ink-lead ring-1 ring-edge ring-inset">
      {children}
    </code>
  );
}

export function Label({
  name,
  value,
  className,
}: {
  name: ReactNode;
  value?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      <span className="truncate type-control font-medium text-ink">{name}</span>
      {value ? (
        <span className="truncate type-label text-ink-body">{value}</span>
      ) : null}
    </span>
  );
}

export function Table({
  head,
  rows,
}: {
  head: readonly ReactNode[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className={cn(PANEL, "overflow-x-auto")}>
      <table className="w-full min-w-[32rem] border-collapse text-left type-body">
        <thead>
          <tr className="border-b border-rule">
            {head.map((cell, i) => (
              <th
                className={cn(
                  TONE.label,
                  "px-fib-4 py-fib-3 font-semibold text-ink-body",
                )}
                key={i}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td
                  className={cn(
                    "px-fib-4 py-fib-3 align-top",
                    i === 0 ? "text-ink" : "text-ink-lead",
                  )}
                  key={i}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const PATTERN_ICONS = [
  "solar:home-2-bold",
  "solar:magnifer-linear",
  "solar:bookmark-bold",
  "solar:layers-bold",
  "solar:heart-bold",
  "solar:star-bold",
  "solar:play-bold",
  "solar:settings-bold",
] as const;
