import type { JSX } from "react";
import { DiarySkeleton } from "@/features/profile/components/skeleton";

export default function Loading(): JSX.Element {
  return <DiarySkeleton />;
}
