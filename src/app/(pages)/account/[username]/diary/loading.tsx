import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountDiaryLoading(): JSX.Element {
  return <AccountSectionSkeleton section="diary" />;
}
