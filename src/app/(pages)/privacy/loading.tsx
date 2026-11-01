import type { JSX } from "react";
import { LegalPage, PRIVACY } from "@/features/legal";

// The document is fixed, so it stands in for itself while the route loads.
export default function Loading(): JSX.Element {
  return <LegalPage document={PRIVACY} />;
}
