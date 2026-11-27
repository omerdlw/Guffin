"use client";

import { useState, useTransition } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import { report } from "@omerdlw/base-framework/utils";

export interface Paged<T> {
  items: T[];
  next: number | null;
}

// A server-rendered first page that the reader extends with "Show more".
// A new page from the server (filters changed, router.refresh) resets the
// list; a failed load keeps what is shown and says so.
export function usePagedList<T>(
  page: Paged<T>,
  load: (offset: number) => Promise<Paged<T>>,
) {
  const toast = useToast();
  const [served, setServed] = useState(page);
  const [items, setItems] = useState(page.items);
  const [next, setNext] = useState(page.next);
  const [pending, startTransition] = useTransition();
  if (page !== served) {
    setServed(page);
    setItems(page.items);
    setNext(page.next);
  }

  const more = () => {
    if (next === null) return;
    startTransition(async () => {
      try {
        const result = await load(next);
        setItems((current) => [...current, ...result.items]);
        setNext(result.next);
      } catch (error) {
        report("Profile page load", error);
        toast("Couldn't load more, try again");
      }
    });
  };

  return { hasMore: next !== null, items, more, pending, setItems };
}
