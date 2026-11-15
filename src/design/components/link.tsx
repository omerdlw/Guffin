"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  JSX,
  MouseEvent,
  ReactNode,
  Ref,
} from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import NextLink from "next/link";
import { INLINE_LINK, TONE } from "@/design/foundations/tones";
import { type VariantProps, variants } from "@/design/foundations/variants";
import { cn } from "@/design/ui";

export const linkVariants = variants("cursor-pointer outline-none", {
  variants: {
    variant: {
      inline: INLINE_LINK,
      reveal:
        "underline decoration-transparent underline-offset-2 hover:text-ink hover:decoration-current focus-visible:text-ink focus-visible:decoration-current",
      hairline:
        "border-b border-ink-faint hover:border-ink-muted focus-visible:border-ink-muted",
      label: TONE.link,
      quiet: "text-ink-body hover:text-ink focus-visible:text-ink",
    },
  },
  defaultVariants: { variant: "inline" },
});

export type LinkVariants = VariantProps<typeof linkVariants>;

function useDockLinkClick(href: string, onNavigated?: () => void) {
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

type NextLinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

export type LinkProps = NextLinkProps & LinkVariants;

export function Link({ className, variant, ...props }: LinkProps): JSX.Element {
  return (
    <NextLink
      {...props}
      className={cn(variant && linkVariants({ variant }), className)}
    />
  );
}

export type DockLinkProps = Omit<NextLinkProps, "onClick" | "prefetch"> &
  LinkVariants & {
    /**
     * Unavailable for now (a step past the last page): the same element, so
     * a link that comes and goes keeps its node and does not arrive again.
     */
    disabled?: boolean;
    onNavigated?: () => void;
  };

const preventDefault = (event: MouseEvent<HTMLAnchorElement>) =>
  event.preventDefault();

export function DockLink({
  className,
  disabled = false,
  href,
  onNavigated,
  variant,
  ...props
}: DockLinkProps): JSX.Element {
  const onClick = useDockLinkClick(href, onNavigated);
  return (
    <NextLink
      {...props}
      aria-disabled={disabled || undefined}
      className={cn(
        variant && linkVariants({ variant }),
        disabled && "pointer-events-none",
        className,
      )}
      href={href}
      onClick={disabled ? preventDefault : onClick}
      prefetch={false}
      tabIndex={disabled ? -1 : props.tabIndex}
    />
  );
}

export interface ExternalLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>, LinkVariants {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}

export function ExternalLink({
  className,
  rel = "noopener noreferrer",
  target = "_blank",
  variant,
  ...props
}: ExternalLinkProps): JSX.Element {
  return (
    <a
      {...props}
      className={cn(variant && linkVariants({ variant }), className)}
      rel={rel}
      target={target}
    />
  );
}

export interface TextButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, LinkVariants {
  ref?: Ref<HTMLButtonElement>;
}

export function TextButton({
  className,
  type = "button",
  variant = "quiet",
  ...props
}: TextButtonProps): JSX.Element {
  return (
    <button
      {...props}
      className={cn(
        linkVariants({ variant }),
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      type={type}
    />
  );
}

export function FactLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}): JSX.Element {
  return (
    <DockLink aria-label={label} href={href} variant="hairline">
      {children}
    </DockLink>
  );
}
