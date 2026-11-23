import type { JSX } from "react";
import { RouteLoading } from "@/design/components/route-loading";
import { MovieSkeleton } from "@/features/movie";

export default function MovieLoading(): JSX.Element {
  return (
    <RouteLoading>
      <MovieSkeleton />
    </RouteLoading>
  );
}
