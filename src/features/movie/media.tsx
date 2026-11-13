"use client";

import { useModal } from "@omerdlw/base-framework/modal";
import { AnimatePresence, motion } from "@/motion/lib";
import { ArtworkPrint, useArtworkPath } from "@/features/artwork/artwork";
import { ImageModal } from "@/features/detail/gallery";
import { useMediaType } from "@/features/media/context";
import { DetailCount } from "@/features/detail/motion";
import { DetailBackdrop, DetailIntermission } from "@/features/detail/stage";
import type { ImageModalData } from "@/features/detail/types";
import {
  type Awards,
  type MovieDetails,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { POINTS } from "@/motion/constants";
import { step } from "@/motion/utils";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { TONE } from "@/design/foundations/tones";
import { REEL_IMAGE_SIZE, STILL_BADGE_RUNG } from "./constants";
import type { MovieArtwork } from "./types";
import { formatMoneyOrZero, readableUrl } from "./utils";
import { useReel } from "./views";

export function MoviePoster({
  awards,
  movie,
}: {
  awards?: Promise<Awards | null>;
  movie: MovieArtwork;
}) {
  const kind = useMediaType();
  const path = useArtworkPath(kind, movie.id, "poster", movie.posterPath);

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
          animate={{ opacity: 1, y: 0 }}
          className={`absolute top-6 right-4 z-20 flex items-center gap-1 p-1 sm:right-6 lg:right-8 ${TONE.glass}`}
          exit={{ opacity: 0, y: -8 }}
          initial={{ opacity: 0, y: -8 }}
          transition={{
            duration: step(STILL_BADGE_RUNG),
            ease: [...POINTS.expo],
          }}
        >
          <span className={`px-3 ${TONE.label} text-ink-muted`}>Still</span>
          <Button
            aria-label="View this still"
            icon
            intent="ghost"
            shape="pill"
            size="sm"
            onClick={() => {
              const src = tmdbImageUrl("backdrop", reel, "original");
              if (!src) return;
              const data: ImageModalData = { alt: `Still of ${title}`, src };
              void openImage(data);
            }}
            type="button"
          >
            <Icon icon="solar:maximize-square-minimalistic-linear" size={16} />
          </Button>
          <Button
            intent="ghost"
            onClick={() => project(null)}
            shape="pill"
            size="sm"
          >
            Back to the film
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MovieBackdropHero({ movie }: { movie: MovieArtwork }) {
  const kind = useMediaType();
  const path = useArtworkPath(kind, movie.id, "backdrop", movie.backdropPath);
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
  const kind = useMediaType();
  const path = useArtworkPath(kind, movie.id, "backdrop", movie.backdropPath);

  return (
    <DetailIntermission
      image={readableUrl(tmdbImageUrl("backdrop", path, "original"))}
      title={movie.title}
    />
  );
}

export function MoneyCount({ index, value }: { index: number; value: number }) {
  return (
    <DetailCount
      format={formatMoneyOrZero}
      hover
      index={index}
      part="value"
      value={value}
    />
  );
}
