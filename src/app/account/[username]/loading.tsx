import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/profile/skeleton";

export default function AccountOverviewLoading(): JSX.Element {
  return <AccountSectionSkeleton section="overview" />;
}
