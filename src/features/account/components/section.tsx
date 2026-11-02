import type { JSX, ReactNode } from "react";
import { cn } from "@/ui/cn";
import { TONE } from "@/ui";
import { AccountLink } from "./link";

export const counted = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

const LABEL = `${TONE.label} text-ink-body`;
const AFTER = `${TONE.label} tabular-nums`;

export function ViewAll({
  href,
  label = "All",
}: {
  href: string;
  label?: string;
}): JSX.Element {
  return (
    <AccountLink
      className={cn(
        AFTER,
        "text-ink-muted hover:text-ink focus-visible:text-ink",
      )}
      href={href}
    >
      {label}
    </AccountLink>
  );
}

export function Section({
  action,
  children,
  className,
  summary,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  summary?: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <section className={cn("flex w-full min-w-0 flex-col", className)}>
      <header className="mb-4 flex min-h-7 items-end justify-between gap-4 border-b border-line pb-2">
        <h2 className={LABEL}>{title}</h2>
        {summary || action ? (
          <div className="flex shrink-0 items-center gap-4">
            {summary ? (
              <span className={cn(AFTER, "text-ink-muted")}>{summary}</span>
            ) : null}
            {action}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function CountLink({
  count,
  href,
}: {
  count: number;
  href: string;
}): JSX.Element {
  return (
    <AccountLink
      className={cn(
        AFTER,
        "text-ink-muted hover:text-ink focus-visible:text-ink",
      )}
      href={href}
    >
      {count.toLocaleString("en-US")}
    </AccountLink>
  );
}
