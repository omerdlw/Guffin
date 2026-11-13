import type { JSX } from "react";
import { DockLink } from "@/design/components/link";
import { marqueeClass } from "@/design/foundations/layout";
import { MoviePoster } from "@/features/movie/media";
import type { MovieArtwork } from "@/features/movie/types";
import { TITLE_LIMITS } from "@/features/movie/utils";
import { DetailBloom } from "./motion";

export function MediaReviewsHeader({
  href,
  media,
  poster = true,
}: {
  href: string;
  poster?: boolean;
  media: MovieArtwork;
}): JSX.Element {
  return (
    <>
      {poster ? (
        <div className="mb-8 w-40 sm:w-48 lg:w-56">
          <MoviePoster movie={media} />
        </div>
      ) : null}
      <DockLink
        className="ui-fade flex flex-col [--touch-kids:none] hover:opacity-80 focus-visible:opacity-80"
        href={href}
      >
        <DetailBloom
          as="h1"
          className={marqueeClass(media.title, TITLE_LIMITS)}
          part="title"
          text={media.title}
        />
      </DockLink>
    </>
  );
}
