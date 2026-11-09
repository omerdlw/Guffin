import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/profile/skeleton";

export default function AccountListLoading(): JSX.Element {
  return <AccountSectionSkeleton section="list" />;
}
