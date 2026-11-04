import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/profile/skeleton";

export default function AccountActivityLoading(): JSX.Element {
  return <AccountSectionSkeleton section="activity" />;
}
