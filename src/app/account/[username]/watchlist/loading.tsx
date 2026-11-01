import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountWatchlistLoading(): JSX.Element {
  return <AccountSectionSkeleton section="media" />;
}
