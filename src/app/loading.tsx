import type { JSX } from "react";
import { Spinner } from "@/ui/feedback";

export default function Loading(): JSX.Element {
  return <Spinner size={30} />;
}
