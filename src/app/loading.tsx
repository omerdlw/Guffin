import type { JSX } from "react";
import { Spinner } from "@omerdlw/base-framework/ui";

export default function Loading(): JSX.Element {
  return <Spinner size={30} />;
}
