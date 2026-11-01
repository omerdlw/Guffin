import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountActivityLoading(): JSX.Element {
  return <AccountSectionSkeleton section="activity" />;
}
