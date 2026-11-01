import type { JSX } from "react";
import { LegalPage, TERMS } from "@/features/legal";

// The document is fixed, so it stands in for itself while the route loads.
export default function Loading(): JSX.Element {
  return <LegalPage document={TERMS} />;
}
