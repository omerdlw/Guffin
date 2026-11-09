import type { JSX } from "react";
import { Spinner } from "@/design/components/loader";

export default function Loading(): JSX.Element {
  return <Spinner size={30} />;
}
