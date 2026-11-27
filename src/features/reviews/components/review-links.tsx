"use client";

import { useEffect } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { report } from "@omerdlw/base-framework/utils";
import { usePathname } from "next/navigation";
import { parseReviewHref } from "@/shared/site";
import { reviewSurface } from "../surfaces";

export function ReviewLinks(): null {
  const { openSurface } = useDockActions();
  const pathname = usePathname();

  useEffect(() => {
    const open = (href: string) => {
      const target = parseReviewHref(href);
      if (!target) return false;
      reviewSurface
        .open(openSurface, { target })
        .catch((error) => report("Review surface open", error));
      return true;
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor || anchor.target === "_blank") return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      if (!open(url.href)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, [openSurface]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("review")) return;
    const target = parseReviewHref(url);
    if (!target) return;
    url.searchParams.delete("review");
    window.history.replaceState(window.history.state, "", url);
    reviewSurface
      .open(openSurface, { target })
      .catch((error) => report("Review surface open", error));
  }, [openSurface, pathname]);

  return null;
}
