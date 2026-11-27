import type { JSX } from "react";
import { ProfileListsSkeleton } from "@/features/profile/components/skeleton";

export default function Loading(): JSX.Element {
  return <ProfileListsSkeleton />;
}
