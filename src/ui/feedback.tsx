"use client";

import {
  type CSSProperties,
  type JSX,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { report } from "@omerdlw/base-framework/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { BouncingDots } from "loading-dev";
import Link from "next/link";
import { Button } from "./button";
import { cn } from "./cn";
import { Icon } from "./media";
import { primitivesTheme } from "./theme";

export function Loader({
  children,
  className,
  color,
  size = 14,
}: {
  children?: ReactNode;
  className?: string;
  color?: string;
  size?: number;
}) {
  const theme = useTheme(primitivesTheme);
  const dots = <BouncingDots size={size} color={color} />;

  if (children) {
    return (
      <span
        className={cn(theme.slots.loader, theme.slots.stack, className)}
        role="status"
        aria-label="Loading"
      >
        <span className={theme.slots.stackBase}>{children}</span>
        <span className={theme.slots.stackTop}>{dots}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(theme.slots.loader, theme.slots.loaderInline, className)}
      style={theme.styles.loaderInline}
      role="status"
      aria-label="Loading"
    >
      {dots}
    </span>
  );
}

export function Spinner({
  className,
  size = 15,
}: {
  className?: string;
  size?: number;
}) {
  const theme = useTheme(primitivesTheme);
  return (
    <div
      className={cn(theme.slots.spinner, className)}
      aria-label="Loading"
      role="status"
    >
      <Icon icon="mingcute:loading-3-fill" size={size} />
    </div>
  );
}

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
      <h2 className="type-heading font-semibold text-ink">{title}</h2>
      <p className="mt-2 type-body text-ink-muted">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          className="bg-fill-hover px-4 py-2 type-body font-medium text-ink hover:bg-fill-active focus-visible:bg-fill-active"
          onClick={reset}
          type="button"
        >
          Try again
        </Button>
        <Link
          className="bg-fill px-4 py-2 type-body font-medium text-ink-body ring-1 ring-edge-hover hover:bg-fill-hover focus-visible:bg-fill-hover"
          href="/"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

const SLATE = /^(.*\S)\s+\((\d{4})\)(?:,\s*(.+))?$/;

function Ink({ text }: { text: ReactNode }) {
  const slate = typeof text === "string" ? SLATE.exec(text) : null;
  return (
    <span className="tooltip-ink">
      {slate ? (
        <>
          {slate[1]}
          <span className="tooltip-meta">
            {slate[3] ? `${slate[2]} · ${slate[3]}` : slate[2]}
          </span>
        </>
      ) : (
        text
      )}
    </span>
  );
}

interface TooltipProps {
  children: ReactNode;
  "data-cursor-owned"?: string;
  position?: "top" | "right" | "bottom" | "left";
  text: ReactNode;
}

export function Tooltip({
  children,
  position = "top",
  text,
  ...props
}: TooltipProps) {
  const theme = useTheme(primitivesTheme);
  const trigger = useRef<HTMLButtonElement>(null);
  const [inModule, setInModule] = useState(false);
  const owned = "data-cursor-owned" in props;

  return (
    <TooltipPrimitive.Root
      onOpenChange={(open) => {
        if (open && owned) {
          setInModule(Boolean(trigger.current?.closest(".ui-motion")));
        }
      }}
    >
      <TooltipPrimitive.Trigger asChild ref={trigger}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={position}
          align="center"
          sideOffset={10}
          collisionPadding={8}
          className={theme.slots.tooltip}
          style={theme.styles.tooltip as CSSProperties}
          data-cursor-owned={owned && !inModule ? "" : undefined}
        >
          <Ink text={text} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
