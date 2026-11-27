import type { JSX } from "react";
import { ProfileReviewsSkeleton } from "@/features/profile/components/skeleton";

export default function Loading(): JSX.Element {
  return <ProfileReviewsSkeleton />;
}
