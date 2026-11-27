"use client";

import { useModal } from "@omerdlw/base-framework/modal";
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import {
  ArtworkPrint,
  useArtworkPath,
} from "@/features/artwork/components/artwork";
import { ImageModal } from "@/features/detail-page/components/image-modal";
import {
  DetailBackdrop,
  DetailIntermission,
} from "@/features/detail-page/components/stage";
import { DetailCount } from "@/features/detail-page/motion";
import {
  type Awards,
  type MovieDetails,
  tmdbImageUrl,
} from "@/infrastructure/tmdb/model";
import { formatMoney, type MovieArtwork, readableUrl } from "../model";
import { useReel } from "../view-context";

const REEL_IMAGE_SIZE = "w1280";

const formatMoneyOrZero = (amount: number) => formatMoney(amount) ?? "$0";

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
  if (!reel) return null;
  return (
    <div
      className={cn(
        "absolute top-6 right-4 z-20 flex items-center gap-1 p-1 sm:right-6 lg:right-8",
        TONE.glass,
      )}
    >
      <span className={cn("px-3 text-ink-muted", TONE.label)}>Still</span>
      <Button
        aria-label="View this still"
        icon
        intent="ghost"
        shape="pill"
        size="sm"
        onClick={() => {
          const src = tmdbImageUrl("backdrop", reel, "original");
          if (!src) return;
          void openImage({ alt: `Still of ${title}`, src });
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
    </div>
  );
}

export function MovieBackdropHero({
  movie,
}: {
  movie: MovieArtwork;
}) {
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
    <DetailBackdrop src={image} still={still} tall>
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
      image={readableUrl(tmdbImageUrl("backdrop", path, "original"))}
      title={movie.title}
    />
  );
}

export function MoneyCount({ index, value }: { index: number; value: number }) {
  return (
    <DetailCount
      format={formatMoneyOrZero}
      index={index}
      part="value"
      value={value}
    />
  );
}
