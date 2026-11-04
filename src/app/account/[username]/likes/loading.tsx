import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/profile/skeleton";

export default function AccountLikesLoading(): JSX.Element {
  return <AccountSectionSkeleton section="media" />;
}
