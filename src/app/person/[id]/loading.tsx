import type { JSX } from "react";
import { RouteLoading } from "@/design/components/route-loading";
import { PersonSkeleton } from "@/features/person";

export default function PersonLoading(): JSX.Element {
  return (
    <RouteLoading>
      <PersonSkeleton />
    </RouteLoading>
  );
}
