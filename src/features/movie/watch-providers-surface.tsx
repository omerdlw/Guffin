"use client";

import { type JSX, type ReactNode, useEffect, useMemo, useState } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { Icon } from "@/design/components/icon";
import { ExternalLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { SKELETON } from "@/design/components/skeleton";
import { SurfaceSegmentedControl } from "@/design/components/segmented-control";
import { Select } from "@/design/components/select";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import {
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import { RADIUS } from "@/design/foundations/geometry";
import { WELL, WELL_HOVER } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { defineSurface } from "@/design/surface-definition";
import { tmdbImageUrl } from "@/infrastructure/tmdb/shared";
import { getWatchProvidersAction } from "./actions";
import { flagOf, pickRegion, regionName, useWatchRegion } from "./region";
import type { ProviderEntry, RegionProviders } from "./movie";

type WatchProvidersSource =
  | { status: "loading" }
  | { error: string; status: "error" }
  | { regions: Record<string, RegionProviders>; status: "ready" };

interface WatchProvidersData {
  movieId: number;
  title: string;
}

type ProviderCategory = "stream" | "rent" | "buy" | "free";

const PROVIDER_CATEGORIES: readonly {
  key: ProviderCategory;
  label: string;
}[] = [
  { key: "stream", label: "Stream" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
  { key: "free", label: "Free" },
];

const PROVIDER_SEARCH_URLS: readonly [RegExp, (q: string) => string][] = [
  [/netflix/i, (q) => `https://www.netflix.com/search?q=${q}`],
  [/prime|amazon/i, (q) => `https://www.primevideo.com/search?phrase=${q}`],
  [/apple|itunes/i, (q) => `https://tv.apple.com/search?term=${q}`],
  [
    /google play/i,
    (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
  ],
  [
    /youtube/i,
    (q) => `https://www.youtube.com/results?search_query=${q}+full+movie`,
  ],
  [/disney/i, (q) => `https://www.disneyplus.com/search?q=${q}`],
  [/\bmax\b|hbo/i, (q) => `https://play.max.com/search?q=${q}`],
  [/paramount/i, (q) => `https://www.paramountplus.com/search/?query=${q}`],
  [/peacock/i, (q) => `https://www.peacocktv.com/search?q=${q}`],
  [/hulu/i, (q) => `https://www.hulu.com/search?q=${q}`],
  [/mubi/i, (q) => `https://mubi.com/search?query=${q}`],
  [/tubi/i, (q) => `https://tubitv.com/search/${q}`],
  [/pluto/i, (q) => `https://pluto.tv/search/details?q=${q}`],
  [/crunchyroll/i, (q) => `https://www.crunchyroll.com/search?q=${q}`],
];

const PROVIDER_GRID = ["grid-cols-1", "grid-cols-2", "grid-cols-3"] as const;

const PROVIDER_TILE =
  "group/tile relative flex min-w-0 rounded-card text-ink-body hover:text-ink";

const PROVIDER_LAYOUT = {
  hero: "items-center gap-4 p-3 pr-5",
  grid: "flex-col items-center gap-3 px-2 pt-5 pb-4",
} as const;

const PROVIDER_LOGO = {
  hero: "size-16",
  grid: "size-14",
} as const;

function providerHref(
  provider: ProviderEntry,
  title: string,
  region: RegionProviders,
): string | null {
  const q = encodeURIComponent(title.trim());
  const match = PROVIDER_SEARCH_URLS.find(([pattern]) =>
    pattern.test(provider.name),
  );
  if (match && q) return match[1](q);
  return region.link;
}

const REGION_SELECT = {
  root: "w-auto shrink-0",
  trigger:
    "h-control-sm w-auto gap-1.5 rounded-full px-3 type-meta font-medium text-ink-body hover:text-ink aria-expanded:text-ink [&_[data-name]]:hidden",
  chevron: "size-3 text-[length:12px]",
  content: "w-60 max-h-[min(20rem,var(--select-room))] [&_[data-code]]:hidden",
  option: "rounded-inset",
};

function RegionSelect({
  codes,
  onChange,
  value,
}: {
  codes: readonly string[];
  onChange: (code: string) => void;
  value: string;
}): JSX.Element {
  const options = useMemo(
    () =>
      codes.map((code) => ({
        label: (
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true">{flagOf(code)}</span>
            <span className="truncate" data-name="">
              {regionName(code)}
            </span>
            <span data-code="">{code}</span>
          </span>
        ),
        value: code,
      })),
    [codes],
  );
  return (
    <Select
      ariaLabel="Region"
      className={REGION_SELECT.root}
      classNames={REGION_SELECT}
      disabled={codes.length === 0}
      onChange={onChange}
      options={options}
      placeholder={<Icon icon="solar:global-linear" size={14} />}
      value={value || undefined}
    />
  );
}

export const watchProvidersSurface = defineSurface<{
  data: WatchProvidersData;
}>({
  component: WatchProvidersSurface,
  description: "Where this movie can be watched",
  icon: "solar:tv-bold",
  title: "Where to Watch",
});

function ProviderTile({
  href,
  layout,
  provider,
}: {
  href: string | null;
  layout: keyof typeof PROVIDER_LAYOUT;
  provider: ProviderEntry;
}): JSX.Element {
  const hero = layout === "hero";
  const className = cn(
    PROVIDER_TILE,
    PROVIDER_LAYOUT[layout],
    href && "cursor-pointer",
  );
  const content = (
    <>
      <MediaCard
        aspect="free"
        className="shrink-0 shadow-(--lift)"
        fallbackIcon="solar:tv-bold"
        fallbackIconSize={20}
        frameClassName={cn(
          PROVIDER_LOGO[layout],
          "ring-1 ring-edge ring-inset",
        )}
        framed={false}
        image={{
          sizes: hero ? "64px" : "56px",
          src: tmdbImageUrl("logo", provider.logoPath, "original"),
        }}
        radius={hero ? RADIUS.card : RADIUS.tile}
      />
      {hero ? (
        <span className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>{provider.name}</span>
          {href ? (
            <span className={SURFACE_META} data-slot="caption">
              Open in {provider.name}
            </span>
          ) : null}
        </span>
      ) : (
        <span
          className="line-clamp-2 w-full text-center type-meta font-medium text-balance"
          data-slot="caption"
        >
          {provider.name}
        </span>
      )}
      {href ? (
        <Icon
          className={cn(
            "center text-ink-muted opacity-60",
            !hero && "absolute top-2.5 right-2.5",
          )}
          data-slot="icon"
          icon="solar:arrow-right-up-linear"
          size={hero ? 16 : 13}
        />
      ) : null}
    </>
  );

  if (!href) return <div className={className}>{content}</div>;

  return (
    <ExternalLink className={className} href={href}>
      {content}
    </ExternalLink>
  );
}

function useWatchProviders(movieId: number): WatchProvidersSource {
  const [source, setSource] = useState<WatchProvidersSource>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    getWatchProvidersAction(movieId)
      .then((result) => {
        if (cancelled) return;
        setSource(
          result.success
            ? { regions: result.regions, status: "ready" }
            : { error: result.error, status: "error" },
        );
      })
      .catch((reason) => {
        if (cancelled) return;
        report("WatchProvidersSurface load", reason);
        setSource({ error: "Could not load where to watch", status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  return source;
}

function countProviders(region: RegionProviders | null) {
  const counts = {
    buy: region?.buy.length ?? 0,
    free: region?.free.length ?? 0,
    rent: region?.rent.length ?? 0,
    stream: region?.stream.length ?? 0,
  };
  return { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

function WatchProvidersNote({
  children,
  className = "min-h-40",
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <SurfacePart className={`center ${className}`} name="note">
      {children}
    </SurfacePart>
  );
}

function WatchProvidersSurface({
  data,
}: {
  data: WatchProvidersData;
}): JSX.Element {
  const source = useWatchProviders(data.movieId);
  const regions = source.status === "ready" ? source.regions : null;
  const [chosenCategory, setChosenCategory] = useState<ProviderCategory | null>(
    null,
  );

  const codes = useMemo(
    () =>
      Object.keys(regions ?? {}).sort((a, b) =>
        regionName(a).localeCompare(regionName(b)),
      ),
    [regions],
  );
  const selectedRegion = useWatchRegion(codes);
  const region = regions?.[selectedRegion] ?? null;
  const counts = countProviders(region);
  const visibleCategories = PROVIDER_CATEGORIES.filter(
    (category) => category.key !== "free" || counts.free > 0,
  );
  const activeCategory =
    chosenCategory ??
    visibleCategories.find((category) => counts[category.key] > 0)?.key ??
    "stream";
  const activeProviders = region?.[activeCategory] ?? [];

  const status =
    source.status === "ready" && (!region || counts.total === 0)
      ? "empty"
      : source.status;

  return (
    <SurfaceStage>
      <SurfaceSegmentedControl
        ariaLabel="Kind of availability"
        items={visibleCategories.map((category) => ({
          count: counts[category.key],
          key: category.key,
          label: category.label,
        }))}
        onChange={setChosenCategory}
        trailing={
          <RegionSelect
            codes={codes}
            onChange={pickRegion}
            value={selectedRegion}
          />
        }
        value={activeCategory}
      />

      <SurfaceSwap className={SURFACE_STACK} cue="items" id={status} now>
        {source.status === "error" ? (
          <WatchProvidersNote>
            <p className="type-body text-ink-body">{source.error}</p>
          </WatchProvidersNote>
        ) : source.status === "loading" ? (
          <SurfacePart
            className={cn(
              PROVIDER_LAYOUT.hero,
              "flex rounded-card",
              WELL,
              SKELETON.pulse,
            )}
            name="note"
          >
            <span
              className={cn(SKELETON.block, PROVIDER_LOGO.hero, "rounded-card")}
            />
            <span className="flex flex-1 flex-col gap-2">
              <span className={cn(SKELETON.block, "h-3.5 w-32 rounded-full")} />
              <span className={cn(SKELETON.soft, "h-3 w-44 rounded-full")} />
            </span>
          </SurfacePart>
        ) : !region || status === "empty" ? (
          <WatchProvidersNote className="min-h-40 flex-col gap-1.5 text-center">
            <p className="type-body font-medium text-ink-body">Not available</p>
            <p className="type-body text-ink-body">
              No service lists this movie right now
            </p>
          </WatchProvidersNote>
        ) : (
          <>
            <SurfacePart name="item">
              <div
                className={`${SURFACE_SCROLL} flex max-h-[min(52dvh,24rem)] flex-col`}
                data-scroll-native
              >
                {activeProviders.length > 0 ? (
                  <SurfaceSwap
                    className={cn(
                      "grid gap-2.5",
                      PROVIDER_GRID[Math.min(activeProviders.length, 3) - 1],
                    )}
                    cue="rows"
                    id={`${selectedRegion}-${activeCategory}`}
                    now
                  >
                    {activeProviders.map((provider, index) => (
                      <SurfacePart
                        className={`rounded-card ${WELL} ${WELL_HOVER}`}
                        index={index}
                        key={provider.id}
                        name="tile"
                      >
                        <ProviderTile
                          href={providerHref(provider, data.title, region)}
                          layout={
                            activeProviders.length === 1 ? "hero" : "grid"
                          }
                          provider={provider}
                        />
                      </SurfacePart>
                    ))}
                  </SurfaceSwap>
                ) : (
                  <p className="py-6 text-center type-meta text-ink-muted">
                    No {activeCategory} options available in this region
                  </p>
                )}
              </div>
            </SurfacePart>
          </>
        )}
      </SurfaceSwap>
    </SurfaceStage>
  );
}
