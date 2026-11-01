import type { JSX } from "react";
import { LegalPage, PRIVACY } from "@/features/legal";

export default function Loading(): JSX.Element {
  return <LegalPage document={PRIVACY} />;
}
