import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/profile/skeleton";

export default function AccountListsLoading(): JSX.Element {
  return <AccountSectionSkeleton section="lists" />;
}
