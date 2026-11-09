"use client";

import type { JSX } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { VITRIN_COOKIE_NAME } from "@/lib/env";
import { SegmentedControl } from "@/design/components/segmented-control";
import { DockAction } from "@/design/components/surface";
import { VITRIN_COOKIE_MAX_AGE, VITRIN_ITEMS } from "./constants";
import type { MediaType } from "./types";
import { withVitrin } from "./utils";

function readCookie(): MediaType {
  try {
    const match = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${VITRIN_COOKIE_NAME}=`));
    return match?.split("=")[1] === "tv" ? "tv" : "movie";
  } catch {
    return "movie";
  }
}

/** Films / Shows switch for the dock card on profile pages. */
export function MediaTypeAction(): JSX.Element {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const asked = params.get("v");
  const value: MediaType =
    asked === "tv" ? "tv" : asked === "movie" ? "movie" : readCookie();

  const choose = (next: MediaType) => {
    if (next === value) return;
    document.cookie = `${VITRIN_COOKIE_NAME}=${next}; path=/; max-age=${VITRIN_COOKIE_MAX_AGE}; samesite=lax`;
    const search = params.toString();
    startTransition(() =>
      router.replace(
        withVitrin(`${pathname}${search ? `?${search}` : ""}`, next),
        { scroll: false },
      ),
    );
  };

  return (
    <DockAction>
      <SegmentedControl
        ariaLabel="Show films or shows"
        size="md"
        width="fill"
        items={VITRIN_ITEMS}
        onChange={choose}
        value={value}
      />
    </DockAction>
  );
}
