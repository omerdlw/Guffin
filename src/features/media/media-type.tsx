"use client";

import { type JSX, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VITRIN_COOKIE_NAME } from "@/lib/env";
import { SlidingPill, useSlidingPill } from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import { VITRIN_COOKIE_MAX_AGE, VITRIN_ITEMS } from "./constants";
import type { MediaType } from "./types";
import { withVitrin } from "./utils";

export function useVitrin(remembered: MediaType): {
  asked: MediaType | null;
  choose: (next: MediaType, to?: string) => void;
  value: MediaType;
} {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const raw = params.get("v");
  const asked: MediaType | null =
    raw === "tv" ? "tv" : raw === "movie" ? "movie" : null;
  // The cookie is read on the server and passed in; reading document.cookie
  // during render made SSR and hydration disagree.
  const value: MediaType = asked ?? remembered;

  const choose = (next: MediaType, to?: string) => {
    if (next === value) return;
    document.cookie = `${VITRIN_COOKIE_NAME}=${next}; path=/; max-age=${VITRIN_COOKIE_MAX_AGE}; samesite=lax`;
    const search = params.toString();
    const href = to ?? `${pathname}${search ? `?${search}` : ""}`;
    startTransition(() =>
      router.replace(withVitrin(href, next), { scroll: false }),
    );
  };

  return { asked, choose, value };
}

export function MediaTypeSwitch({
  onChange,
  value,
}: {
  onChange: (next: MediaType) => void;
  value: MediaType;
}): JSX.Element {
  const { box: pill, ref } = useSlidingPill<HTMLDivElement>(
    "[data-chosen]",
    value,
    { wrapping: true },
  );

  return (
    <div
      aria-label="Show films or shows"
      className="relative flex shrink-0 flex-col items-stretch gap-0.5 rounded-panel bg-veil p-1 lg:h-10 lg:flex-row lg:rounded-full ring-1 ring-edge-hover in-data-backdrop:backdrop-saturate-150 ring-inset select-none"
      ref={ref}
      role="tablist"
    >
      {pill ? (
        <SlidingPill box={pill} className="rounded-full bg-grade/15" />
      ) : null}
      {VITRIN_ITEMS.map((item) => {
        const chosen = item.key === value;
        return (
          <button
            aria-selected={chosen}
            className={cn(
              "relative inline-flex flex-1 cursor-pointer items-center justify-center rounded-full px-2.5 type-meta sm:px-4 sm:type-control lg:flex-none font-medium whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-edge-focus focus-visible:ring-inset",
              chosen
                ? "text-ink"
                : "text-ink-body hover:text-ink focus-visible:text-ink",
              chosen && !pill && "bg-grade/15",
            )}
            data-chosen={chosen ? "" : undefined}
            key={item.key}
            onClick={() => onChange(item.key)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
