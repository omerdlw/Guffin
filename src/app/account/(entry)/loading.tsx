import type { JSX } from "react";
import { RouteLoading } from "@/design/components/route-loading";
import {
  OverviewSkeleton,
  ProfileFrameSkeleton,
} from "@/features/profile/components/skeleton";

export default function Loading(): JSX.Element {
  return (
    <RouteLoading>
      <ProfileFrameSkeleton>
        <OverviewSkeleton />
      </ProfileFrameSkeleton>
    </RouteLoading>
  );
}
