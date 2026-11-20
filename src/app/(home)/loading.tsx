import type { JSX } from "react";
import { HomeSkeleton } from "@/features/home/skeleton";

export default function HomeLoading(): JSX.Element {
  return <HomeSkeleton />;
}
