"use client";

import type { JSX } from "react";
import Link from "next/link";
import { cn } from "@/ui/cn";
import { LEGAL_CONTACT_EMAIL, LEGAL_LINKS } from "../constants";
import { useDockLinkClick } from "@/ui";

const BASE =
  "cine-fade flex-1 px-4 py-3 text-center type-body font-medium ring-1 ring-inset outline-none focus-visible:ring-edge-focus";

function LegalLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}): JSX.Element {
  const onClick = useDockLinkClick(href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        BASE,
        active
          ? "bg-fill-hover text-ink ring-edge-hover"
          : "bg-fill text-ink-body ring-edge hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink hover:ring-edge-hover focus-visible:ring-edge-focus",
      )}
      href={href}
      onClick={onClick}
      prefetch={false}
    >
      {label}
    </Link>
  );
}

export function LegalLinks({ active }: { active: string | null }): JSX.Element {
  return (
    <nav aria-label="Legal" className="flex flex-col gap-2 sm:flex-row">
      {LEGAL_LINKS.map((link) => (
        <LegalLink
          active={active === link.href}
          href={link.href}
          key={link.href}
          label={link.label}
        />
      ))}
      <a
        className={cn(
          BASE,
          "bg-fill text-ink-body ring-edge hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink hover:ring-edge-hover focus-visible:ring-edge-focus",
        )}
        href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      >
        Contact
      </a>
    </nav>
  );
}
