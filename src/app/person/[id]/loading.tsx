import type { JSX } from "react";
import { PersonSkeleton } from "@/features/person";
import { Handoff } from "@/motion/page-handoff";

export default function PersonLoading(): JSX.Element {
  return (
    <Handoff>
      <PersonSkeleton />
    </Handoff>
  );
}
