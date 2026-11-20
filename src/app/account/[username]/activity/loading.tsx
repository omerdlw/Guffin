import type { JSX } from "react";
import { ActivitySkeleton } from "@/features/profile/skeleton";

export default function Loading(): JSX.Element {
  return <ActivitySkeleton />;
}
