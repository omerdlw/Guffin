"use client";

import { useStore } from "@omerdlw/base-framework/hooks";
import { createStore } from "@omerdlw/base-framework/utils";

export interface ReviewsPager {
  clear: () => void;
  left: number;
  loading: boolean;
  more: () => void;
  reviewer: string | null;
  stats: { average: number | null; rated: number; total: number };
}

export function describeReviewStats({
  average,
  rated,
  total,
}: ReviewsPager["stats"]): string {
  const reviews = `${total} ${total === 1 ? "review" : "reviews"}`;
  return average === null
    ? reviews
    : `★ ${average}/5 (${rated} rated) · ${reviews}`;
}

const pagerStore = createStore<ReviewsPager | null>(null);

export function setReviewsPager(next: ReviewsPager | null): void {
  pagerStore.publish(next);
}

export function useReviewsPager(): ReviewsPager | null {
  return useStore(pagerStore);
}
