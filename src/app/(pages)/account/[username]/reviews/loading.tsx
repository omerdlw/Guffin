import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/account";

export default function AccountReviewsLoading(): JSX.Element {
  return <AccountSectionSkeleton section="reviews" />;
}
