import type { ComponentProps, JSX, ReactNode } from "react";
import { cn } from "@/ui/cn";
import { TONE } from "@/ui";
import { AccountPart, AccountSection } from "../motion";
import { AccountLink } from "./link";

export const counted = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

const LABEL = `${TONE.label} text-ink-body`;
const AFTER = `${TONE.label} tabular-nums`;

export type SectionCue = ComponentProps<typeof AccountSection>["cue"];

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

// A band of a member's page, played when it is reached: its rule is drawn out
// from the left while the title and what sits at the end of it are lit, then
// whatever the band holds arrives by the beat named in `cue`.
export function Section({
  action,
  children,
  className,
  cue = "rows",
  summary,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  cue?: SectionCue;
  summary?: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <AccountSection
      className={cn("flex w-full min-w-0 flex-col", className)}
      cue={cue}
    >
      <header className="relative mb-4 flex min-h-7 items-end justify-between gap-4 pb-2">
        <AccountPart as="h2" className={LABEL} name="label">
          {title}
        </AccountPart>
        {summary || action ? (
          <AccountPart
            className="flex shrink-0 items-center gap-4"
            name="label"
          >
            {summary ? (
              <span className={cn(AFTER, "text-ink-muted")}>{summary}</span>
            ) : null}
            {action}
          </AccountPart>
        ) : null}
        <AccountPart
          className="absolute inset-x-0 bottom-0 h-px bg-line"
          name="rule"
        />
      </header>
      {children}
    </AccountSection>
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
