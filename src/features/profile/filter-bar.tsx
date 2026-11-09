"use client";

import {
  type JSX,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { Select } from "@/design/components/select";
import { cn } from "@/design/foundations/cn";
import { ANY_OPTION, FILTER_BAR_LOOK, SEARCH_SETTLE_MS } from "./constants";
import type { FilterField } from "./types";

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

function SearchField({
  onSearch,
  pending,
  placeholder,
  query,
}: {
  onSearch: (query: string) => void;
  pending: boolean;
  placeholder: string;
  query: string;
}): JSX.Element {
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

  const send = useCallback(
    (value: string) => {
      setSent(value);
      onSearch(value);
    },
    [onSearch],
  );

  useEffect(() => {
    const next = text.trim();
    if (next === sent) return;
    const timer = setTimeout(() => send(next), SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [send, sent, text]);

  return (
    <form
      className={FILTER_BAR_LOOK.form}
      onSubmit={(event) => {
        event.preventDefault();
        const next = text.trim();
        if (next !== sent) send(next);
      }}
      role="search"
    >
      <Input
        aria-label={placeholder}
        className={FILTER_BAR_LOOK.input}
        maxLength={80}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
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
    </form>
  );
}

function FilterSelect({
  alone,
  field,
  onChange,
  searchable,
  selected,
}: {
  alone: boolean;
  field: FilterField;
  onChange: (key: string, value: string | null) => void;
  searchable: boolean;
  selected: string | null;
}): JSX.Element {
  const look = FILTER_BAR_LOOK;
  const fallback = field.defaultValue ?? "";
  const options = field.allLabel
    ? [{ label: field.allLabel, value: ANY_OPTION }, ...field.options]
    : field.options;
  const current = selected ?? field.defaultValue ?? ANY_OPTION;

  return (
    <Select
      ariaLabel={field.allLabel ?? field.key}
      className={cn(
        look.select,
        searchable && look.share,
        alone && "col-span-full",
      )}
      shape="pill"
      onChange={(value) =>
        onChange(
          field.key,
          value === ANY_OPTION || value === fallback ? null : value,
        )
      }
      options={options}
      value={
        options.some((option) => option.value === current)
          ? current
          : ANY_OPTION
      }
    />
  );
}

export function FilterBar({
  fields,
  searchPlaceholder = "Search",
}: {
  fields: readonly FilterField[];
  searchPlaceholder?: string | null;
}): JSX.Element {
  const { apply, isFiltered, pending, query, reset, search } =
    useFilterAddress(fields);
  const changeField = useCallback(
    (key: string, value: string | null) => apply({ [key]: value }),
    [apply],
  );
  const searchQuery = useCallback(
    (value: string) => apply({ q: value || null }),
    [apply],
  );

  return (
    <div className={FILTER_BAR_LOOK.root}>
      {searchPlaceholder ? (
        <SearchField
          onSearch={searchQuery}
          pending={pending}
          placeholder={searchPlaceholder}
          query={query}
        />
      ) : null}
      {fields.map((field, index) => (
        <FilterSelect
          alone={fields.length % 2 === 1 && index === fields.length - 1}
          field={field}
          key={field.key}
          onChange={changeField}
          searchable={Boolean(searchPlaceholder)}
          selected={search.get(field.key)}
        />
      ))}
      {isFiltered ? (
        <Button
          className={FILTER_BAR_LOOK.reset}
          intent="ghost"
          onClick={reset}
          shape="pill"
        >
          <Icon icon="solar:close-circle-linear" size={14} />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
