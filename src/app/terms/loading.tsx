import type { JSX } from "react";
import { LegalPage, TERMS } from "@/features/legal";

export default function Loading(): JSX.Element {
  return <LegalPage document={TERMS} />;
}
