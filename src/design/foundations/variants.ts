import { cva, type VariantProps } from "class-variance-authority";
import type { ClassValue } from "clsx";
import { cn } from "./cn";

export function variants<T>(
  base?: ClassValue,
  config?: Parameters<typeof cva<T>>[1],
) {
  const recipe = cva<T>(base, config);
  return (props?: Parameters<typeof recipe>[0]): string => cn(recipe(props));
}

export type { VariantProps };
