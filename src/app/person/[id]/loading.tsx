import type { JSX } from "react";
import { PersonSkeleton } from "@/features/person/skeleton";
import { Handoff } from "@/motion/transitions";

export default function PersonLoading(): JSX.Element {
  return (
    <Handoff>
      <PersonSkeleton />
    </Handoff>
  );
}
