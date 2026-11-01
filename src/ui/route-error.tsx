"use client";

import { useEffect, type JSX } from "react";
import Link from "next/link";
import { report } from "@omerdlw/base-framework/utils";
import { Button } from "./button";

export function RouteError({
  error,
  message,
  reset,
  title,
}: {
  error: Error & { digest?: string };
  message: string;
  reset: () => void;
  title: string;
}): JSX.Element {
  useEffect(() => {
    report(title, error);
  }, [error, title]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          className="bg-fill-hover px-4 py-2 text-sm font-medium text-ink hover:bg-fill-active"
          onClick={reset}
          type="button"
        >
          Try again
        </Button>
        <Link
          className="bg-fill px-4 py-2 text-sm font-medium text-ink-body ring-1 ring-edge-hover hover:bg-fill-hover"
          href="/"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
