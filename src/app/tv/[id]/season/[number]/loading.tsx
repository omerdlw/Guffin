import type { JSX } from "react";
import { MovieSkeleton } from "@/features/movie/skeleton";

export default function ShowLoading(): JSX.Element {
  return <MovieSkeleton />;
}
