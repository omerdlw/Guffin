"use client";

import { type JSX, useEffect } from "react";
import { report } from "@omerdlw/base-framework/utils";
import Link from "next/link";
import { Button, buttonVariants } from "../button";

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
    <main
      id="main"
      className="ui-scene flex min-h-screen flex-col items-center justify-center p-6 text-center"
    >
      <h2 className="type-heading font-semibold text-ink">{title}</h2>
      <p className="mt-2 type-body text-ink-muted">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button intent="primary" onClick={reset} shape="pill">
          Try again
        </Button>
        <Link className={buttonVariants({ shape: "pill" })} href="/">
          Home
        </Link>
      </div>
    </main>
  );
}
