import { cva, type VariantProps } from "class-variance-authority";
import type { ClassValue } from "clsx";
import { cn } from "./cn";

/**
 * `cva`, merged through the design system's `cn`, so a `className` passed by a
 * caller replaces the recipe's class from the same family (a later `h-8`
 * replaces the recipe's `h-control-md`, `rounded-full` replaces
 * `rounded-card`) instead of both landing in the DOM.
 *
 * Every class must be written out literally in the recipe: Tailwind finds
 * classes by reading the source, so a class assembled at runtime is never
 * generated.
 */
export function variants<T>(
  base?: ClassValue,
  config?: Parameters<typeof cva<T>>[1],
) {
  const recipe = cva<T>(base, config);
  return (props?: Parameters<typeof recipe>[0]): string => cn(recipe(props));
}

export type { VariantProps };
