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
import NextLink from "next/link";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { INLINE_LINK, TONE } from "@/design/foundations/tones";
import { type VariantProps, variants } from "@/design/foundations/variants";
import { cn } from "@/design/ui";

export const linkVariants = variants("cursor-pointer outline-none", {
  variants: {
    variant: {
      inline: INLINE_LINK,
      reveal:
        "underline decoration-transparent underline-offset-2 hover:text-ink hover:decoration-current",
      hairline: "border-b border-ink-faint hover:border-ink-muted",
      label: TONE.link,
      quiet: "text-ink-body hover:text-ink",
    },
  },
  defaultVariants: { variant: "inline" },
});

type LinkVariants = VariantProps<typeof linkVariants>;

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

type LinkProps = NextLinkProps & LinkVariants;

export function Link({ className, variant, ...props }: LinkProps): JSX.Element {
  return (
    <NextLink
      {...props}
      className={cn(variant && linkVariants({ variant }), className)}
    />
  );
}

type DockLinkProps = Omit<NextLinkProps, "onClick" | "prefetch"> &
  LinkVariants & {
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

interface ExternalLinkProps
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

interface TextButtonProps
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
  ...rest
}: {
  children: ReactNode;
  href: string;
  label: string;
} & Record<`data-${string}`, string | undefined>): JSX.Element {
  return (
    <DockLink aria-label={label} href={href} variant="hairline" {...rest}>
      {children}
    </DockLink>
  );
}
