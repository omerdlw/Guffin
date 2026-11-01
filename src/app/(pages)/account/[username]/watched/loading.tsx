import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountWatchedLoading(): JSX.Element {
  return <AccountSectionSkeleton section="media" />;
}
