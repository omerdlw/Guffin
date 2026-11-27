import type { JSX } from "react";
import { LegalPage } from "@/features/legal/components/legal-view";
import { TERMS } from "@/features/legal/documents";

export default function Loading(): JSX.Element {
  return <LegalPage document={TERMS} />;
}
