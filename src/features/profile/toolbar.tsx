"use client";

import { type JSX, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { Select } from "@/design/components/select";
import { cn } from "@/design/ui";
import { QUERY_PARAM } from "./filters";

const TYPING_MS = 300;

export interface ToolbarField {
  fallback: string;
  key: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
}

export function ListsToolbar({
  base,
  fields,
  label,
  placeholder,
  query,
}: {
  base: string;
  fields: ToolbarField[];
  label: string;
  placeholder: string;
  query: string;
}): JSX.Element {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const servedValues = Object.fromEntries(
    fields.map((field) => [field.key, field.value]),
  );
  const servedKey = JSON.stringify([query, servedValues]);
  const [chosen, setChosen] = useState({ query, values: servedValues });
  const [served, setServed] = useState(servedKey);
  if (served !== servedKey) {
    setServed(servedKey);
    setChosen({ query, values: servedValues });
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (next: typeof chosen) => {
    const params = new URLSearchParams();
    const text = next.query.trim();
    if (text) params.set(QUERY_PARAM, text);
    for (const field of fields) {
      const value = next.values[field.key];
      if (value && value !== field.fallback) params.set(field.key, value);
    }
    const search = params.toString();
    const href = search ? `${base}?${search}` : base;
    startTransition(() => router.replace(href, { scroll: false }));
  };

  const type = (text: string) => {
    const next = { ...chosen, query: text };
    setChosen(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), TYPING_MS);
  };

  const pick = (key: string, value: string) => {
    if (chosen.values[key] === value) return;
    const next = { ...chosen, values: { ...chosen.values, [key]: value } };
    setChosen(next);
    clearTimeout(timer.current);
    go(next);
  };

  const single = fields.length === 1;

  return (
    <div className="flex flex-wrap items-center gap-fib-3" data-part="filters">
      <label
        className={cn(
          "relative min-w-0",
          single ? "flex-1" : "basis-full md:basis-0 md:flex-1",
        )}
      >
        <Icon
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
          icon="solar:magnifer-linear"
          size={16}
        />
        <Input
          aria-label={label}
          className="pl-10"
          onChange={(event) => type(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={chosen.query}
        />
      </label>
      {fields.map((field) => (
        <Select
          ariaLabel={field.label}
          className={
            single
              ? "w-44 shrink-0 sm:w-56"
              : "min-w-0 flex-1 md:w-44 md:flex-none"
          }
          key={field.key}
          onChange={(value) => pick(field.key, value)}
          options={field.options}
          value={chosen.values[field.key] ?? field.fallback}
        />
      ))}
    </div>
  );
}
