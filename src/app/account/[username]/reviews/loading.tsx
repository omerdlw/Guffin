import type { JSX } from "react";
import { AccountSectionSkeleton } from "@/features/profile/skeleton";

export default function AccountReviewsLoading(): JSX.Element {
  return <AccountSectionSkeleton section="reviews" />;
}
