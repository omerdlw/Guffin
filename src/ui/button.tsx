"use client";

import {
  type ButtonHTMLAttributes,
  type ComponentProps,
  type JSX,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useState,
} from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useTheme } from "@omerdlw/base-framework/theme";
import Link from "next/link";
import { Magnet } from "@/motion/tilt";
import { cn } from "./cn";
import { Loader } from "./feedback";
import { Icon } from "./media";
import { SurfacePart, SurfaceStage, Unfold } from "./surface";
import { primitivesTheme } from "./theme";
import { TONE } from "./tokens";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  children,
  className,
  disabled = false,
  loading = false,
  ref,
  type = "button",
  ...props
}: ButtonProps) {
  const theme = useTheme(primitivesTheme);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      className={cn(theme.slots.button, className)}
      {...props}
    >
      {loading ? (
        <span className={theme.slots.stack}>
          <span className={theme.slots.stackBase}>{children}</span>
          <span className={theme.slots.stackTop}>
            <Loader />
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

const BASE =
  "cine-card cine-fade group center relative w-full cursor-pointer gap-2.5 overflow-hidden rounded-full type-control font-medium select-none";

export function ActionButton({
  active,
  ariaLabel,
  className,
  disabled = false,
  hoverLabel,
  icon,
  iconSize = 16,
  label,
  loading,
  onClick,
}: {
  active: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  hoverLabel?: string;
  icon: { off: string; on: string };
  iconSize?: number;
  label: ReactNode;
  loading?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <Button
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(BASE, className, active ? TONE.chosen : TONE.surface)}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      <Magnet className="gap-2.5">
        <span
          className={cn(
            "inline-flex shrink-0 transition-[scale] duration-reveal ease-out-expo",
            active ? "scale-108" : "group-hover:scale-108",
          )}
        >
          <Icon icon={active ? icon.on : icon.off} size={iconSize} />
        </span>
        <span className="relative">
          <span
            className={cn(
              hoverLabel &&
                "cine-fade group-hover:opacity-0 group-focus-visible:opacity-0 group-has-focus-visible:opacity-0",
            )}
          >
            {label}
          </span>
          {hoverLabel ? (
            <span className="cine-fade absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-has-focus-visible:opacity-100">
              {hoverLabel}
            </span>
          ) : null}
        </span>
      </Magnet>
    </Button>
  );
}

export function DockAction({ children }: { children: ReactNode }) {
  return (
    <SurfaceStage>
      <Unfold>
        <SurfacePart name="item">{children}</SurfacePart>
      </Unfold>
    </SurfaceStage>
  );
}

export function useDockLinkClick(href: string, onNavigated?: () => void) {
  const { navigate } = useDockActions();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
      return;
    event.preventDefault();
    void navigate(href).then((committed) => {
      if (committed) onNavigated?.();
    });
  };
}

export function FactLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}) {
  const handleClick = useDockLinkClick(href);
  return (
    <Link
      aria-label={label}
      className="cine-fade border-b border-ink-faint outline-none hover:border-ink-muted focus-visible:border-ink-muted"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      {children}
    </Link>
  );
}

export function AccountLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "onClick" | "prefetch"> & {
  href: string;
}): JSX.Element {
  const onClick = useDockLinkClick(href);
  return <Link {...props} href={href} onClick={onClick} prefetch={false} />;
}

export function useConfirmStep(
  resetMs = 3000,
): [confirming: boolean, setConfirming: (value: boolean) => void] {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), resetMs);
    return () => window.clearTimeout(timer);
  }, [confirming, resetMs]);

  return [confirming, setConfirming];
}
