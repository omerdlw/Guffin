"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { AnimatePresence, motion } from "motion/react";
import { ArtworkPrint, useArtworkPath } from "@/features/artwork/artwork";
import { artworkTarget } from "@/features/artwork/utils";
import { WALL_SIZES } from "@/features/detail/constants";
import { Heading } from "@/features/detail/layout";
import {
  DetailCount,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import {
  DetailBackdrop,
  DetailIntermission,
  DetailViews,
  GalleryWall,
  ImageModal,
  useLead,
  WallButton,
} from "@/features/detail/stage";
import type { ImageModalData, WallSet } from "@/features/detail/types";
import {
  type Awards,
  type MovieDetails,
  type MovieImage,
  type MovieVideo,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { POINTS } from "@/motion/constants";
import { useScrollDriver } from "@/motion/react";
import { step } from "@/motion/utils";
import { SegmentedControl } from "@/ui/form";
import { Carousel, Icon, MediaCard } from "@/ui/media";
import { CAROUSEL_WIDE_ITEM, RADIUS, TONE } from "@/ui/tokens";
import { VideoModal } from "./cast";
import {
  GALLERY_REACH_STEP,
  GALLERY_TAB_ORDER,
  GALLERY_TABS,
  REEL_IMAGE_SIZE,
  SLATE_RUNG,
} from "./constants";
import type {
  GalleryTab,
  MovieArtwork,
  MovieViewKey,
  MovieViewState,
  ReelState,
  VideoModalData,
} from "./types";
import {
  galleryOriginal,
  galleryThumbnail,
  moneyLabel,
  pictureOf,
  pluralType,
  wallThumbnail,
} from "./utils";

export function MovieGallery({
  backdrops,
  posters,
  title,
}: {
  backdrops: MovieImage[];
  posters: MovieImage[];
  title: string;
}) {
  const [openImage] = useModal(ImageModal);
  const lead = useLead();
  useEffect(() => () => lead(null), [lead]);
  const sets: Record<GalleryTab, MovieImage[]> = { backdrops, posters };
  const available = GALLERY_TAB_ORDER.filter((key) => sets[key].length > 0);
  const [tab, setTab] = useState<GalleryTab>(available[0] ?? "backdrops");
  const [reach, setReach] = useState(GALLERY_REACH_STEP);
  const key = available.includes(tab) ? tab : available[0];
  const total = key ? sets[key].length : 0;
  const more = () =>
    setReach((count) => (count < total ? count + GALLERY_REACH_STEP : count));
  if (!key) return null;

  const images = sets[key].slice(0, reach);
  const view = GALLERY_TABS[key];
  const choose = (next: GalleryTab) => {
    setTab(next);
    setReach(GALLERY_REACH_STEP);
  };

  const open = (path: string, index: number) => {
    const full = galleryOriginal(key, path);
    if (!full) return;
    const data: ImageModalData = {
      alt: `${view.noun[0].toUpperCase()}${view.noun.slice(1)} ${index + 1} of ${title}`,
      src: full,
    };
    void openImage(data);
  };

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          <div className="flex items-center gap-2">
            {available.length > 1 ? (
              <SegmentedControl
                ariaLabel="Gallery images"
                className={TONE.tabs}
                items={available.map((itemKey) => ({
                  key: itemKey,
                  label: `${GALLERY_TABS[itemKey].label} ${sets[itemKey].length}`,
                }))}
                onChange={choose}
                value={key}
              />
            ) : null}
            <WallButton set={key} />
          </div>
        }
        icon="solar:gallery-wide-bold"
        title="Gallery"
      />
      <DetailSwap cue="slides" id={key}>
        <div
          onPointerLeave={() => lead(null)}
          onPointerOver={(event) => {
            if (event.pointerType !== "mouse") return;
            const card = (event.target as Element).closest("[data-still]");
            const still = card?.getAttribute("data-still");
            const slot = key === "backdrops" ? "backdrop" : "poster";
            lead(still ? tmdbImageUrl(slot, still, "w300") : null);
          }}
        >
          <Carousel
            arrowClassName={TONE.arrows}
            className="rounded-card"
            itemClassName={
              key === "backdrops" && total === 1 ? "w-full" : view.item
            }
            label={view.label}
            onNearEnd={more}
            part="slide"
          >
            {images.map((image, index) => {
              const label = `View ${view.noun} ${index + 1} of ${title}`;
              const shown = galleryThumbnail(key, image.filePath);
              return (
                <MediaCard
                  key={image.filePath}
                  {...artworkTarget(
                    key === "backdrops" ? "backdrop" : "poster",
                    image.filePath,
                  )}
                  aspect={view.aspect}
                  data-still={image.filePath}
                  image={{
                    crossOrigin: shown.crossOrigin,
                    sizes: view.sizes,
                    src: shown.src,
                    srcSet: shown.srcSet ?? undefined,
                  }}
                  label={label}
                  onClick={() => open(image.filePath, index)}
                  radius={RADIUS.card}
                />
              );
            })}
          </Carousel>
        </div>
      </DetailSwap>
    </DetailSection>
  );
}

export function MovieGalleryWall({
  backdrops,
  posters,
  title,
}: {
  backdrops: MovieImage[];
  posters: MovieImage[];
  title: string;
}) {
  const sets: WallSet[] = GALLERY_TAB_ORDER.flatMap((key) => {
    const images = key === "backdrops" ? backdrops : posters;
    if (images.length === 0) return [];
    const view = GALLERY_TABS[key];
    const slot = key === "backdrops" ? "backdrop" : "poster";
    return [
      {
        aspect: view.aspect,
        key,
        label: view.label,
        noun: view.noun,
        pictures: images.map((image) => {
          const shown = wallThumbnail(key, image.filePath);
          return {
            crossOrigin: shown.crossOrigin,
            full: galleryOriginal(key, image.filePath),
            lead: tmdbImageUrl(slot, image.filePath, "w300"),
            path: image.filePath,
            sizes: key === "backdrops" ? WALL_SIZES.video : WALL_SIZES.poster,
            src: shown.src,
            srcSet: shown.srcSet ?? undefined,
          };
        }),
        slot,
      },
    ];
  });
  return <GalleryWall back="Back to the film" sets={sets} title={title} />;
}

export function MovieVideos({
  types,
  videos,
}: {
  types: string[];
  videos: MovieVideo[];
}) {
  const [openVideo] = useModal(VideoModal);
  const [type, setType] = useState(types[0] ?? "");
  if (types.length === 0) return null;

  const visible = videos.filter((v) => v.site === "YouTube" && v.type === type);

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          <SegmentedControl
            ariaLabel="Video type"
            className={TONE.tabs}
            items={types.map((t) => ({ key: t, label: pluralType(t) }))}
            onChange={setType}
            value={type}
          />
        }
        icon="solar:video-frame-play-horizontal-bold"
        title="Videos"
      />

      <DetailSwap cue="slides" id={type}>
        <Carousel
          arrowClassName={TONE.arrows}
          className="rounded-card"
          itemClassName={visible.length === 1 ? "w-full" : CAROUSEL_WIDE_ITEM}
          label="Videos"
          part="slide"
        >
          {visible.map((video) => (
            <MediaCard
              key={video.id}
              aspect="video"
              fallbackIcon="solar:video-frame-play-horizontal-bold"
              image={{
                sizes:
                  "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
                src: `https://img.youtube.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`,
              }}
              label={`Play ${video.name}`}
              radius={RADIUS.card}
              onClick={() => {
                const data: VideoModalData = {
                  key: video.key,
                  name: video.name,
                };
                void openVideo(data);
              }}
              overlay={
                <>
                  <div className="cine-play center pointer-events-none absolute inset-0 text-ink">
                    <Icon icon="solar:play-circle-bold" size={48} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
                    <h3 className="truncate type-body font-semibold text-ink">
                      {video.name}
                    </h3>
                  </div>
                </>
              }
            />
          ))}
        </Carousel>
      </DetailSwap>
    </DetailSection>
  );
}

const ReelContext = createContext<ReelState>({
  project: () => {},
  reel: null,
});

export const useReel = () => use(ReelContext);

export function ReelProvider({ children }: { children: ReactNode }) {
  const [reel, setReel] = useState<string | null>(null);
  const driver = useScrollDriver();

  const project = useCallback(
    (path: string | null) => {
      setReel(path);
      if (!path) return;
      if (driver.active) driver.to(0);
      else window.scrollTo({ behavior: "smooth", top: 0 });
    },
    [driver],
  );

  useEffect(() => {
    if (!reel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reel]);

  const value = useMemo(() => ({ project, reel }), [project, reel]);
  return <ReelContext value={value}>{children}</ReelContext>;
}

const MovieViewContext = createContext<MovieViewState | null>(null);

export function MovieViewProvider({
  children,
  initialView = "overview",
}: {
  children: ReactNode;
  initialView?: MovieViewKey;
}) {
  const [view, setView] = useState<MovieViewKey>(initialView);
  const toggle = useCallback(
    (next: MovieViewKey) =>
      setView((current) => (current === next ? "overview" : next)),
    [],
  );
  const value = useMemo(
    () => ({ show: setView, toggle, view }),
    [toggle, view],
  );
  return <MovieViewContext value={value}>{children}</MovieViewContext>;
}

export function useMovieView(): MovieViewState {
  const state = use(MovieViewContext);
  if (!state) {
    throw new Error("useMovieView needs a MovieViewProvider above it");
  }
  return state;
}

export function MovieViews({
  views,
}: {
  views: Record<MovieViewKey, ReactNode>;
}) {
  const { view } = useMovieView();
  return <DetailViews shown={view} views={views} />;
}

export function MoviePoster({
  awards,
  movie,
}: {
  awards?: Promise<Awards | null>;
  movie: MovieArtwork;
}) {
  const path = useArtworkPath("movie", movie.id, "poster", movie.posterPath);

  return (
    <ArtworkPrint
      alt={`${movie.title} poster`}
      awards={awards}
      className="@container w-full shrink-0"
      fallbackIcon="solar:clapperboard-play-bold"
      frameClassName="h-[round(150cqw,1px)]"
      part="poster"
      path={path}
      src={tmdbImageUrl("poster", path, "w780")}
    />
  );
}

function Slate({ title }: { title: string }) {
  const { project, reel } = useReel();
  const [openImage] = useModal(ImageModal);
  return (
    <AnimatePresence>
      {reel ? (
        <motion.div
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className={`absolute top-6 right-4 z-20 flex items-center gap-1 p-1 sm:right-6 lg:right-8 ${TONE.glass}`}
          exit={{ filter: "blur(6px)", opacity: 0, y: -8 }}
          initial={{ filter: "blur(6px)", opacity: 0, y: -8 }}
          transition={{ duration: step(SLATE_RUNG), ease: [...POINTS.expo] }}
        >
          <span className={`px-3 ${TONE.label} text-ink-muted`}>Still</span>
          <button
            aria-label="View this still"
            className="cine-fade center size-8 cursor-pointer rounded-full text-ink-body hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink"
            onClick={() => {
              const src = tmdbImageUrl("backdrop", reel, "original");
              if (!src) return;
              const data: ImageModalData = { alt: `Still of ${title}`, src };
              void openImage(data);
            }}
            type="button"
          >
            <Icon icon="solar:maximize-square-minimalistic-linear" size={16} />
          </button>
          <button
            className="cine-fade h-8 cursor-pointer rounded-full px-3 type-control font-medium text-ink hover:bg-fill-hover focus-visible:bg-fill-hover"
            onClick={() => project(null)}
            type="button"
          >
            Back to the film
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MovieBackdropHero({ movie }: { movie: MovieArtwork }) {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const { reel } = useReel();
  const image = tmdbImageUrl("backdrop", path, "original");
  const still = reel ? tmdbImageUrl("backdrop", reel, REEL_IMAGE_SIZE) : null;
  if (!image) return null;

  return (
    <DetailBackdrop src={image} still={still} title={movie.title}>
      <Slate title={movie.title} />
    </DetailBackdrop>
  );
}

export function MovieProjection({
  movie,
}: {
  movie: Pick<MovieDetails, "backdropPath" | "id" | "title">;
}) {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );

  return (
    <DetailIntermission
      image={pictureOf(tmdbImageUrl("backdrop", path, "original"))}
      title={movie.title}
    />
  );
}

export function MoneyCount({ index, value }: { index: number; value: number }) {
  return (
    <DetailCount
      format={moneyLabel}
      hover
      index={index}
      part="value"
      value={value}
    />
  );
}
