import type { JSX } from "react";
import { PersonSkeleton } from "@/features/person/skeleton";

export default function PersonLoading(): JSX.Element {
  return <PersonSkeleton />;
}
