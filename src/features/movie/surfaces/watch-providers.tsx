"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type JSX,
} from "react";
import { LayoutGroup } from "motion/react";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { report } from "@omerdlw/base-framework/utils";
import {
  Icon,
  Loader,
  MediaCard,
  scrollWithin,
  Select,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_END,
  SURFACE_TITLE,
  SurfacePart,
  SurfaceSegmentedControl,
  SurfaceStage,
  SurfaceSwap,
} from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { ProviderEntry, RegionProviders } from "../watch-providers";
import { getWatchProvidersAction } from "../server/watch-providers-actions";

interface WatchProvidersData {
  movieId: number;
  title: string;
}

type ProviderCategory = "stream" | "rent" | "buy" | "free";

const CATEGORIES: readonly {
  icon: string;
  key: ProviderCategory;
  label: string;
}[] = [
  { icon: "solar:play-bold", key: "stream", label: "Stream" },
  { icon: "solar:tag-price-bold", key: "rent", label: "Rent" },
  { icon: "solar:bag-check-bold", key: "buy", label: "Buy" },
  { icon: "solar:gift-bold", key: "free", label: "Free" },
];

export function createWatchProvidersSurfaceEntry(
  data: WatchProvidersData,
): SurfaceEntry {
  return {
    component: WatchProvidersSurface,
    description: "Where this movie can be watched",
    icon: "solar:tv-bold",
    props: { data },
    title: "Where to Watch",
  };
}

const FALLBACK_REGION = "US";

const SEARCH_URLS: readonly [RegExp, (q: string) => string][] = [
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

function providerHref(
  provider: ProviderEntry,
  title: string,
  region: RegionProviders,
): string | null {
  const q = encodeURIComponent(title.trim());
  const match = SEARCH_URLS.find(([pattern]) => pattern.test(provider.name));
  if (match && q) return match[1](q);
  return region.link;
}

const regionName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

const flagOf = (code: string) =>
  String.fromCodePoint(
    ...code.split("").map((char) => 127397 + char.charCodeAt(0)),
  );

function pickRegion(codes: readonly string[]): string {
  const language = typeof navigator === "undefined" ? "" : navigator.language;
  const own = language.split("-")[1]?.toUpperCase();
  if (own && codes.includes(own)) return own;
  return codes.includes(FALLBACK_REGION) ? FALLBACK_REGION : (codes[0] ?? "");
}

const TILE = `${SURFACE_TILE} group/tile ${SURFACE_TILE_END} relative isolate text-ink-body hover:text-ink focus-visible:text-ink`;

function ProviderTile({
  categoryBadge,
  highlighted,
  href,
  onFocus,
  onPointerEnter,
  provider,
}: {
  categoryBadge?: string;
  highlighted: boolean;
  href: string | null;
  onFocus: () => void;
  onPointerEnter: () => void;
  provider: ProviderEntry;
}): JSX.Element {
  const inner = (
    <>
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
        {categoryBadge ? (
          <span
            className={`${SURFACE_META} group-hover/tile:text-ink-body group-focus-visible/tile:text-ink-body group-has-focus-visible/tile:text-ink-body`}
          >
            {categoryBadge}
          </span>
        ) : null}
      </div>
    </>
  );

  return href ? (
    <a
      className={`${TILE} cursor-pointer`}
      href={href}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      rel="noopener noreferrer"
      target="_blank"
    >
      {highlighted ? (
        <SlidingHighlight layoutId="watch-provider-highlight" />
      ) : null}
      {inner}
      <Icon
        className="center relative z-10 group-hover/tile:translate-x-px group-hover/tile:-translate-y-px"
        icon="solar:arrow-right-up-linear"
        size={14}
      />
    </a>
  ) : (
    <div className={TILE} onPointerEnter={onPointerEnter}>
      {highlighted ? (
        <SlidingHighlight layoutId="watch-provider-highlight" />
      ) : null}
      {inner}
    </div>
  );
}

function WatchProvidersSurface({
  data,
}: {
  data: WatchProvidersData;
}): JSX.Element {
  const highlightGroupId = useId();
  const [regions, setRegions] = useState<Record<
    string,
    RegionProviders
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ProviderCategory>("stream");
  const [hoveredProviderId, setHoveredProviderId] = useState<number | null>(
    null,
  );
  const [focusedProviderId, setFocusedProviderId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    getWatchProvidersAction(data.movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setRegions(result.regions);
          setSelectedRegion(pickRegion(Object.keys(result.regions)));
        } else {
          setError(result.error);
        }
      })
      .catch((reason) => {
        if (cancelled) return;
        report("WatchProvidersSurface load", reason);
        setError("Could not load where to watch");
      });
    return () => {
      cancelled = true;
    };
  }, [data.movieId]);

  const codes = useMemo(
    () =>
      Object.keys(regions ?? {}).sort((a, b) =>
        regionName(a).localeCompare(regionName(b)),
      ),
    [regions],
  );

  const region = regions?.[selectedRegion] ?? null;

  const counts = useMemo(() => {
    if (!region) return { buy: 0, free: 0, rent: 0, stream: 0, total: 0 };
    const stream = region.stream.length;
    const rent = region.rent.length;
    const buy = region.buy.length;
    const free = region.free.length;
    const total = stream + rent + buy + free;
    return { buy, free, rent, stream, total };
  }, [region]);

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => {
      if (cat.key === "free") return counts.free > 0;
      return true;
    });
  }, [counts.free]);

  const initialCategorySetRef = useRef(false);

  useEffect(() => {
    if (!region || initialCategorySetRef.current) return;
    if (counts.stream > 0) {
      initialCategorySetRef.current = true;
    } else {
      const firstWithData = visibleCategories.find((c) => counts[c.key] > 0);
      if (firstWithData) {
        setActiveCategory(firstWithData.key);
        initialCategorySetRef.current = true;
      }
    }
  }, [counts, region, visibleCategories]);

  const activeProviders = region ? (region[activeCategory] ?? []) : [];

  const status = error
    ? "error"
    : !regions
      ? "loading"
      : !region || counts.total === 0
        ? "empty"
        : "ready";

  return (
    <SurfaceStage>
      <SurfaceSegmentedControl
        ariaLabel="Kind of availability"
        id="watch-providers-categories"
        items={visibleCategories.map((cat) => ({
          count: counts[cat.key],
          icon: cat.icon,
          key: cat.key,
          label: cat.label,
        }))}
        onChange={setActiveCategory}
        value={activeCategory}
      />

      <SurfaceSwap className={SURFACE_STACK} cue="items" id={status} now>
        {status === "error" ? (
          <SurfacePart className="center min-h-40" name="note">
            <p className="type-body text-ink-body">{error}</p>
          </SurfacePart>
        ) : status === "loading" ? (
          <SurfacePart className="center min-h-40" name="note">
            <Loader />
          </SurfacePart>
        ) : !region || status === "empty" ? (
          <SurfacePart
            className="center min-h-40 flex-col gap-1.5 text-center"
            name="note"
          >
            <p className="type-body font-medium text-ink-body">Not available</p>
            <p className="type-body text-ink-body">
              No service lists this movie right now
            </p>
          </SurfacePart>
        ) : (
          <>
            <SurfacePart name="item">
              <Select
                ariaLabel="Region"
                placement="inline"
                classNames={{
                  content: "static mt-0 max-h-52 rounded-card p-1.5",
                  option: "rounded-inset",
                  trigger:
                    "h-10 rounded-card px-4 py-0 ring-edge hover:ring-edge-hover focus-visible:ring-edge-focus",
                }}
                onChange={setSelectedRegion}
                options={codes.map((code) => ({
                  label: `${flagOf(code)} ${regionName(code)}`,
                  value: code,
                }))}
                value={selectedRegion}
              />
            </SurfacePart>

            <SurfacePart name="item">
              <div
                className={`${SURFACE_SCROLL} flex max-h-[min(52dvh,24rem)] flex-col`}
                data-scroll-native
                onBlur={(event: FocusEvent<HTMLDivElement>) => {
                  if (
                    !(event.relatedTarget instanceof Node) ||
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    setFocusedProviderId(null);
                  }
                }}
                onPointerLeave={() => setHoveredProviderId(null)}
                onWheel={scrollWithin}
              >
                {activeProviders.length > 0 ? (
                  <LayoutGroup
                    id={`watch-providers-${highlightGroupId}-${selectedRegion}-${activeCategory}`}
                  >
                    <SurfaceSwap
                      className="flex flex-col gap-2.5"
                      cue="rows"
                      id={`${selectedRegion}-${activeCategory}`}
                      now
                    >
                      {activeProviders.map((provider, index) => (
                        <SurfacePart index={index} key={provider.id} name="row">
                          <ProviderTile
                            highlighted={
                              (hoveredProviderId ?? focusedProviderId) ===
                              provider.id
                            }
                            href={providerHref(provider, data.title, region)}
                            onFocus={() => setFocusedProviderId(provider.id)}
                            onPointerEnter={() =>
                              setHoveredProviderId(provider.id)
                            }
                            provider={provider}
                          />
                        </SurfacePart>
                      ))}
                    </SurfaceSwap>
                  </LayoutGroup>
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
