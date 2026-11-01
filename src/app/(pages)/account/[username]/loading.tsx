import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountOverviewLoading(): JSX.Element {
  return <AccountSectionSkeleton section="overview" />;
}
