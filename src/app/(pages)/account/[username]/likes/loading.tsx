import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountLikesLoading(): JSX.Element {
  return <AccountSectionSkeleton section="media" />;
}
