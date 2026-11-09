"use client";

import type { JSX } from "react";
import { RouteError } from "@/design/components/route-error";

export default function ShowError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <RouteError
      {...props}
      message="We couldn’t load this show right now. Please try again in a moment"
      title="Show unavailable"
    />
  );
}
