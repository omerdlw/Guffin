import type { JSX } from "react";
import type { Metadata } from "next";
import { TERMS } from "@/features/legal/documents";
import { LegalPage } from "@/features/legal/view";

export const metadata: Metadata = {
  alternates: { canonical: TERMS.path },
  description: TERMS.description,
  title: TERMS.title,
};

export default function TermsPage(): JSX.Element {
  return <LegalPage document={TERMS} />;
}
