import type { JSX } from "react";
import { DockLink } from "@/design/components/link";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";

interface PageNavItem {
  current?: boolean;
  href: string;
  key: string;
  label: string;
}

export function PageNav({
  className,
  items,
  label,
}: {
  className?: string;
  items: readonly PageNavItem[];
  label: string;
}): JSX.Element {
  return (
    <nav aria-label={label} className={cn(TONE.bar, "flex p-1", className)}>
      <ul className="flex flex-wrap items-center justify-center">
        {items.map((item) => (
          <li className="flex" key={item.key}>
            <DockLink
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "center h-control-md rounded-full px-4 type-control font-medium whitespace-nowrap",
                item.current
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink-body",
              )}
              data-cursor-fit="snug"
              href={item.href}
            >
              {item.label}
            </DockLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
