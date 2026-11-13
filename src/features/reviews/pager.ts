"use client";

import { useSyncExternalStore } from "react";

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

let current: ReviewsPager | null = null;
const listeners = new Set<() => void>();

export function setReviewsPager(next: ReviewsPager | null): void {
  current = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useReviewsPager(): ReviewsPager | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
