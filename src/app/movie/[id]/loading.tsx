import type { JSX } from "react";
import { MovieSkeleton } from "@/features/movie/skeleton";
import { Handoff } from "@/motion/transitions";

export default function MovieLoading(): JSX.Element {
  return (
    <Handoff>
      <MovieSkeleton />
    </Handoff>
  );
}
