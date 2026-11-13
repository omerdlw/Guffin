import type { JSX } from "react";
import { MovieSkeleton } from "@/features/movie/skeleton";

export default function MovieLoading(): JSX.Element {
  return <MovieSkeleton />;
}
