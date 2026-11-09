import type { JSX } from "react";
import { PRIVACY } from "@/features/legal/constants";
import { LegalPage } from "@/features/legal/view";

export default function Loading(): JSX.Element {
  return <LegalPage document={PRIVACY} />;
}
