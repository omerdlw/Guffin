import type { JSX } from "react";
import {
  OverviewSkeleton,
  ProfileFrameSkeleton,
} from "@/features/profile/skeleton";

export default function Loading(): JSX.Element {
  return (
    <ProfileFrameSkeleton>
      <OverviewSkeleton />
    </ProfileFrameSkeleton>
  );
}
