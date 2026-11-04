import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/profile/skeleton";

export default function AccountDiaryLoading(): JSX.Element {
  return <AccountSectionSkeleton section="diary" />;
}
