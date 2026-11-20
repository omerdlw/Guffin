"use client";

import type { JSX, ReactNode } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useSurfacePreload } from "@/design/lazy-surface";
import { DockLink } from "@/design/components/link";
import type { PublicAccount } from "@/features/account/account";
import { useAccount } from "@/features/account/provider";
import { followsSurface } from "@/features/social/surfaces";
import { accountHref } from "@/lib/project";
import type { ProfileStats } from "./stats";

const COMPACT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const CELL =
  "flex min-w-0 flex-col-reverse items-center gap-fib-1 px-fib-1 py-fib-3 text-ink-faint hover:bg-fill hover:text-ink-muted";

function figure(value: number): string {
  return value < 10_000 ? value.toLocaleString("en-US") : COMPACT.format(value);
}

function Figure({ label, value }: { label: string; value: number }): ReactNode {
  return (
    <>
      <span className="truncate type-micro tracking-label uppercase">
        {label}
      </span>
      <span className="font-zuume type-heading leading-none font-bold text-ink tabular-nums">
        {figure(value)}
      </span>
    </>
  );
}

export function StatStrip({
  account,
  stats,
}: {
  account: PublicAccount;
  stats: ProfileStats;
}): JSX.Element {
  const { openSurface } = useDockActions();
  const { account: own } = useAccount();
  useSurfacePreload(followsSurface);
  const base = accountHref(account.username);
  const page = (path: string) => `${base}/${path}`;

  const follows = (tab: "followers" | "following") =>
    void followsSurface.open(openSurface, {
      data: {
        canManageRequests: own?.id === account.id,
        displayName: account.displayName || account.username,
        tab,
        userId: account.id,
        username: account.username,
      },
    });

  const links = [
    {
      href: page("watched"),
      label: "Films",
      value: stats.watched,
    },
    { href: page("diary"), label: "This year", value: stats.thisYear },
    { href: page("lists"), label: "Lists", value: stats.lists },
  ];
  const social = [
    { label: "Following", tab: "following", value: stats.following },
    { label: "Followers", tab: "followers", value: stats.followers },
  ] as const;

  return (
    <nav
      aria-label="Profile numbers"
      className="grid grid-cols-5 divide-x divide-rule overflow-hidden rounded-card border border-edge"
      data-section="stats"
    >
      {links.map((cell) => (
        <DockLink
          className={CELL}
          data-part="stat"
          href={cell.href}
          key={cell.label}
        >
          <Figure label={cell.label} value={cell.value} />
        </DockLink>
      ))}
      {social.map((cell) => (
        <button
          className={CELL}
          data-part="stat"
          key={cell.label}
          onClick={() => follows(cell.tab)}
          type="button"
        >
          <Figure label={cell.label} value={cell.value} />
        </button>
      ))}
    </nav>
  );
}
