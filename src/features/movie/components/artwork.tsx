"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { ArtworkPrint, useArtworkPath } from "@/features/artwork";
import { Icon, TONE } from "@/ui";
import { Projection } from "@/motion/effects";
import { CURVE, POINTS, clamp, step } from "@/motion/engine";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import { posterCarry } from "../constants";
import { MoviePart } from "../motion";
import { ImageModal, type ImageModalData } from "./modals";
import { useReel } from "./reel";

type Artwork = Pick<
  MovieDetails,
  "backdropPath" | "id" | "posterPath" | "title"
>;

export function MoviePoster({
  awards,
  movie,
}: {
  awards?: Promise<Awards | null>;
  movie: Artwork;
}) {
  const path = useArtworkPath("movie", movie.id, "poster", movie.posterPath);

  return (
    <ArtworkPrint
      alt={`${movie.title} poster`}
      awards={awards}
      carry={posterCarry(movie.id)}
      className="@container w-full shrink-0"
      fallbackIcon="solar:clapperboard-play-bold"
      frameClassName="h-[round(150cqw,1px)]"
      part="poster"
      path={path}
      src={tmdbImageUrl("poster", path, "w780")}
    />
  );
}

// The projection goes out of focus over the first screen of scroll.
const DEFOCUS_FROM = 24;
const DEFOCUS_TO = 560;

const defocusAt = (y: number) =>
  CURVE.glide(clamp((y - DEFOCUS_FROM) / (DEFOCUS_TO - DEFOCUS_FROM), 0, 1));

const REEL_SIZE = "w1280";

// A cut between two pictures takes the rung a plate settles on, less two.
const CUT_RUNG = 2;
const HALATION = 0.55;
// The still's controls come in on the glass rung.
const SLATE_RUNG = 1;

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

export function MovieBackdropHero({ movie }: { movie: Artwork }) {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const { reel } = useReel();
  const [ready, setReady] = useState(false);
  const image = tmdbImageUrl("backdrop", path, "original");
  const still = reel ? tmdbImageUrl("backdrop", reel, REEL_SIZE) : null;
  if (!image) return null;

  return (
    <div className="relative">
      <MoviePart name="backdrop" ready={ready}>
        <div className="relative">
          <Projection
            cut={step(CUT_RUNG)}
            defocusAt={defocusAt}
            halation={HALATION}
            onReady={() => setReady(true)}
            position="center 20%"
            reel={still}
            src={image}
          />
        </div>
      </MoviePart>
      <Slate title={movie.title} />
    </div>
  );
}
