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
import { type ButtonVariants, buttonVariants } from "../button/variants";
import { useDockLinkClick } from "../../hooks/use-dock-link-click";
import { type LinkVariants, linkVariants } from "./variants";

type NextLinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

export type LinkProps = NextLinkProps & LinkVariants;

/**
 * An in-app link. Unstyled by default (it wraps a card, a row, a poster);
 * pass a `variant` to draw it as text.
 */
export function Link({ className, variant, ...props }: LinkProps): JSX.Element {
  return (
    <NextLink
      {...props}
      className={cn(variant && linkVariants({ variant }), className)}
    />
  );
}

export type LinkButtonProps = NextLinkProps &
  ButtonVariants & { dock?: boolean; onNavigated?: () => void };

/**
 * A link drawn as a button: the same intents, sizes and shapes. With `dock`,
 * it navigates through the dock.
 *
 *   <LinkButton href={movieHref(id)} intent="primary" shape="pill" size="lg">
 */
export function LinkButton({
  className,
  dock = false,
  icon,
  intent,
  onNavigated,
  shape,
  size,
  width,
  ...props
}: LinkButtonProps): JSX.Element {
  const classes = cn(
    buttonVariants({ icon, intent, shape, size, width }),
    className,
  );
  return dock ? (
    <DockLink {...props} className={classes} onNavigated={onNavigated} />
  ) : (
    <NextLink {...props} className={classes} />
  );
}

export type DockLinkProps = Omit<NextLinkProps, "onClick" | "prefetch"> &
  LinkVariants & {
    onNavigated?: () => void;
  };

/** A link that navigates through the dock, so the stage can leave first. */
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

/** A link that leaves the site: a new tab, no opener, no referrer. */
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

/** A button that reads as a link: an action inside text or a section header. */
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

/** A fact value that links somewhere, through the dock. */
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
