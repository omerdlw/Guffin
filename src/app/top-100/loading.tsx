import type { JSX } from "react";
import { RouteLoading } from "@/design/components/route-loading";
import { TunnelSkeleton } from "@/features/spotlights";

export default function Loading(): JSX.Element {
  return (
    <RouteLoading>
      <TunnelSkeleton />
    </RouteLoading>
  );
}
