import type { JSX, ReactNode } from "react";
import { cn } from "@/ui/cn";
import { AccountLink } from "./link";

interface ProfileStat {
  count: number;
  href: string;
  label: string;
}

const CELL = "group/stat flex flex-col items-center gap-1 px-1 sm:px-4";

function Figure({ count, label }: { count: number; label: string }) {
  return (
    <>
      <span className="type-title font-semibold text-ink tabular-nums sm:type-heading">
        {count.toLocaleString("en-US")}
      </span>
      <span className="type-micro font-semibold whitespace-nowrap text-ink-muted uppercase group-hover/stat:text-ink-body group-focus-visible/stat:text-ink-body group-has-focus-visible/stat:text-ink-body min-[400px]:tracking-label">
        {label}
      </span>
    </>
  );
}

function ProfileStatLink({ count, href, label }: ProfileStat) {
  return (
    <li className="flex justify-center">
      <AccountLink className={CELL} href={href}>
        <Figure count={count} label={label} />
      </AccountLink>
    </li>
  );
}

export function ProfileStatButton({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <li className="flex justify-center">
      <button
        className={cn(CELL, "cursor-pointer")}
        onClick={onClick}
        type="button"
      >
        <Figure count={count} label={label} />
      </button>
    </li>
  );
}

export function ProfileStats({
  stats,
}: {
  stats: readonly ProfileStat[];
}): JSX.Element {
  return (
    <>
      {stats.map((stat) => (
        <ProfileStatLink key={stat.label} {...stat} />
      ))}
    </>
  );
}

export function ProfileStatRow({ children }: { children: ReactNode }) {
  return (
    <ul className="grid auto-cols-fr grid-flow-col divide-x divide-rule">
      {children}
    </ul>
  );
}
