import type { JSX } from "react";
import { RouteLoading } from "@/design/components/route-loading";
import { HomeSkeleton } from "@/features/home";

export default function HomeLoading(): JSX.Element {
  return (
    <RouteLoading>
      <HomeSkeleton />
    </RouteLoading>
  );
}
