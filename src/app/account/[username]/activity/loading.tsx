import type { JSX } from "react";
import { ActivitySkeleton } from "@/features/profile/components/skeleton";

export default function Loading(): JSX.Element {
  return <ActivitySkeleton />;
}
