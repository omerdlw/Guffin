"use client";

import { type JSX, type ReactNode, useEffect, useMemo, useState } from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/dock";
import {
  HighlightGroup,
  Loader,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { report } from "@omerdlw/base-framework/utils";
import { Icon } from "@/design/components/icon";
import { ExternalLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { SurfaceSegmentedControl } from "@/design/components/segmented-control";
import { Select } from "@/design/components/select";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import {
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import type { MediaType } from "@/features/catalog/types";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { getWatchProvidersAction } from "./actions";
import { PROVIDER_CATEGORIES, PROVIDER_TILE_CLASS } from "./constants";
import type {
  ProviderCategory,
  ProviderEntry,
  RegionProviders,
  WatchProvidersData,
  WatchProvidersSource,
} from "./types";
import { flagOf, pickRegion, providerHref, regionName } from "./utils";

export function createWatchProvidersSurfaceEntry(
  data: WatchProvidersData,
): SurfaceEntry {
  return {
    component: WatchProvidersSurface,
    description:
      data.mediaType === "tv"
        ? "Where this show can be watched"
        : "Where this movie can be watched",
    icon: "solar:tv-bold",
    props: { data },
    title: "Where to Watch",
  };
}

function ProviderTile({
  href,
  provider,
}: {
  href: string | null;
  provider: ProviderEntry;
}): JSX.Element {
  const highlight = useHighlight(String(provider.id));

  const content = (
    <>
      {highlight.node}
      <MediaCard
        aspect="free"
        className="relative z-10 shrink-0"
        fallbackIcon="solar:tv-bold"
        fallbackIconSize={16}
        frameClassName="size-10"
        framed={false}
        image={{
          sizes: "40px",
          src: tmdbImageUrl("logo", provider.logoPath, "original"),
        }}
        radius={10}
      />
      <div className={`${SURFACE_TEXT} relative z-10`}>
        <span className={SURFACE_TITLE}>{provider.name}</span>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className={PROVIDER_TILE_CLASS} {...highlight.props}>
        {content}
      </div>
    );
  }

  return (
    <ExternalLink
      className={`${PROVIDER_TILE_CLASS} cursor-pointer`}
      href={href}
      {...highlight.props}
    >
      {content}
      <Icon
        className="center relative z-10 group-hover/tile:translate-x-px group-hover/tile:-translate-y-px"
        icon="solar:arrow-right-up-linear"
        size={14}
      />
    </ExternalLink>
  );
}

function useWatchProviders(
  movieId: number,
  mediaType: MediaType,
): WatchProvidersSource {
  const [source, setSource] = useState<WatchProvidersSource>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    getWatchProvidersAction(movieId, mediaType)
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
  }, [mediaType, movieId]);

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
  const source = useWatchProviders(data.movieId, data.mediaType ?? "movie");
  const regions = source.status === "ready" ? source.regions : null;
  const [chosenRegion, setChosenRegion] = useState<string | null>(null);
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
  const selectedRegion = chosenRegion ?? pickRegion(codes);
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
        id="watch-providers-categories"
        items={visibleCategories.map((category) => ({
          count: counts[category.key],
          icon: category.icon,
          key: category.key,
          label: category.label,
        }))}
        onChange={setChosenCategory}
        value={activeCategory}
      />

      <SurfaceSwap className={SURFACE_STACK} cue="items" id={status} now>
        {source.status === "error" ? (
          <WatchProvidersNote>
            <p className="type-body text-ink-body">{source.error}</p>
          </WatchProvidersNote>
        ) : source.status === "loading" ? (
          <WatchProvidersNote>
            <Loader />
          </WatchProvidersNote>
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
              <Select
                ariaLabel="Region"
                classNames={{
                  content: "static mt-0 max-h-52 rounded-card p-1.5",
                  option: "rounded-inset",
                  trigger:
                    "h-10 rounded-card px-4 py-0 ring-edge hover:ring-edge-hover focus-visible:ring-edge-focus",
                }}
                onChange={setChosenRegion}
                options={codes.map((code) => ({
                  label: `${flagOf(code)} ${regionName(code)}`,
                  value: code,
                }))}
                placement="inline"
                value={selectedRegion}
              />
            </SurfacePart>

            <SurfacePart name="item">
              <div
                className={`${SURFACE_SCROLL} flex max-h-[min(52dvh,24rem)] flex-col`}
                data-scroll-native
              >
                {activeProviders.length > 0 ? (
                  <HighlightGroup>
                    <SurfaceSwap
                      className="flex flex-col gap-2.5"
                      cue="rows"
                      id={`${selectedRegion}-${activeCategory}`}
                      now
                    >
                      {activeProviders.map((provider, index) => (
                        <SurfacePart index={index} key={provider.id} name="row">
                          <ProviderTile
                            href={providerHref(provider, data.title, region)}
                            provider={provider}
                          />
                        </SurfacePart>
                      ))}
                    </SurfaceSwap>
                  </HighlightGroup>
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
