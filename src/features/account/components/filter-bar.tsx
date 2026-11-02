"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type JSX,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/ui/cn";
import { Button, Icon, Input, SURFACE_FIELD, Select, TONE } from "@/ui";

interface FilterField {
  allLabel?: string;
  key: string;
  options: readonly { label: string; value: string }[];
  defaultValue?: string;
}

const ANY = "__any__";

const SEARCH_SETTLE_MS = 280;

const LOOK = {
  form: "relative col-span-full min-w-0 md:flex-1",
  input: cn(SURFACE_FIELD, "h-10 w-full rounded-full pr-3 pl-10 type-body"),
  reset:
    "col-span-full inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 type-meta font-semibold text-ink-body uppercase hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink md:justify-start",
  root: "mb-5 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center",
  select: "min-w-0 md:w-44 md:flex-none lg:w-48",
  share: "md:w-auto md:flex-1 lg:w-48 lg:flex-none",
  ...TONE.select,
} as const;

function useFilterAddress(fields: readonly FilterField[]) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const query = search.get("q") ?? "";

  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      const next = params.toString();
      startTransition(() =>
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        }),
      );
    },
    [pathname, router, search],
  );

  const isFiltered =
    Boolean(query) ||
    fields.some((field) => {
      const value = search.get(field.key);
      return Boolean(value) && value !== (field.defaultValue ?? "");
    });

  const reset = useCallback(
    () =>
      apply({
        q: null,
        ...Object.fromEntries(fields.map((field) => [field.key, null])),
      }),
    [apply, fields],
  );

  return { apply, isFiltered, pending, query, reset, search };
}

export function FilterBar({
  fields,
  searchPlaceholder = "Search",
}: {
  fields: readonly FilterField[];
  searchPlaceholder?: string | null;
}): JSX.Element {
  const look = LOOK;
  const { apply, isFiltered, pending, query, reset, search } =
    useFilterAddress(fields);
  const [text, setText] = useState(query);
  const [sent, setSent] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);

  if (query !== seenQuery) {
    setSeenQuery(query);
    if (query !== sent) {
      setSent(query);
      setText(query);
    }
  }

  const sendQuery = useCallback(
    (value: string) => {
      setSent(value);
      apply({ q: value || null });
    },
    [apply],
  );

  useEffect(() => {
    const next = text.trim();
    if (next === sent) return;
    const timer = setTimeout(() => sendQuery(next), SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [sendQuery, sent, text]);

  const items: JSX.Element[] = [];
  if (searchPlaceholder) {
    items.push(
      <form
        className={look.form}
        key="q"
        onSubmit={(event) => {
          event.preventDefault();
          const next = text.trim();
          if (next !== sent) sendQuery(next);
        }}
        role="search"
      >
        <Input
          aria-label={searchPlaceholder}
          className={look.input}
          maxLength={80}
          onChange={(event) => setText(event.target.value)}
          placeholder={searchPlaceholder}
          value={text}
        />
        <Icon
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
          icon={
            pending && text.trim()
              ? "svg-spinners:90-ring-with-bg"
              : "solar:magnifer-linear"
          }
          size={15}
        />
      </form>,
    );
  }
  fields.forEach((field, index) => {
    const lone = fields.length % 2 === 1 && index === fields.length - 1;
    const current = search.get(field.key) ?? field.defaultValue ?? ANY;
    const options = field.allLabel
      ? [{ label: field.allLabel, value: ANY }, ...field.options]
      : field.options;
    items.push(
      <Select
        ariaLabel={field.allLabel ?? field.key}
        className={cn(
          look.select,
          searchPlaceholder && look.share,
          lone && "col-span-full",
        )}
        classNames={{
          content: look.content,
          option: look.option,
          trigger: look.trigger,
        }}
        key={field.key}
        onChange={(value) =>
          apply({
            [field.key]:
              value === ANY || value === (field.defaultValue ?? "")
                ? null
                : value,
          })
        }
        options={options}
        value={
          options.some((option) => option.value === current) ? current : ANY
        }
      />,
    );
  });

  return (
    <div className={look.root}>
      {items}
      {isFiltered ? (
        <Button className={look.reset} onClick={reset}>
          <Icon icon="solar:close-circle-linear" size={14} />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
