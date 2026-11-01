import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountListLoading(): JSX.Element {
  return <AccountSectionSkeleton section="list" />;
}
