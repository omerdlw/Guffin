"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  JSX,
  ReactNode,
  Ref,
} from "react";
import NextLink from "next/link";
import { cn } from "../../foundations/cn";
import { useDockLinkClick } from "../../hooks/use-dock-link-click";
import { type LinkVariants, linkVariants } from "./variants";

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
    onNavigated?: () => void;
  };

export function DockLink({
  className,
  href,
  onNavigated,
  variant,
  ...props
}: DockLinkProps): JSX.Element {
  const onClick = useDockLinkClick(href, onNavigated);
  return (
    <NextLink
      {...props}
      className={cn(variant && linkVariants({ variant }), className)}
      href={href}
      onClick={onClick}
      prefetch={false}
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
