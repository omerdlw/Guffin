import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountListsLoading(): JSX.Element {
  return <AccountSectionSkeleton section="lists" />;
}
