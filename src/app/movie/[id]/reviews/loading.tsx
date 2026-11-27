import type { JSX } from "react";
import { ReviewsPageSkeleton } from "@/features/detail-page/components/skeleton";

export default function ReviewsLoading(): JSX.Element {
  return <ReviewsPageSkeleton />;
}
