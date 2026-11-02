"use client";

import type { ComponentProps, JSX } from "react";
import { cn } from "@/ui/cn";
import { ActionButton } from "@/ui";
import { DetailPart } from "../motion";

const SIZE = "h-12 px-4 py-0 disabled:cursor-wait";
const SECONDARY_SIZE = "h-11 gap-2 px-3";

// One of the hand's buttons under the poster, a part of the opening.
export function DetailAction({
  grow = false,
  label,
  secondary = false,
  shortLabel,
  ...props
}: Omit<
  ComponentProps<typeof ActionButton>,
  "ariaLabel" | "className" | "iconSize" | "label"
> & {
  grow?: boolean;
  label: string;
  secondary?: boolean;
  shortLabel?: string;
}): JSX.Element {
  return (
    <DetailPart className={cn("min-w-0", grow && "flex-1")} name="action">
      <ActionButton
        {...props}
        ariaLabel={secondary && shortLabel ? label : undefined}
        className={cn(SIZE, secondary && SECONDARY_SIZE)}
        iconSize={secondary ? 14 : 16}
        label={
          shortLabel && secondary ? (
            shortLabel
          ) : shortLabel ? (
            <>
              <span className="sm:max-xl:hidden">{label}</span>
              <span className="hidden sm:max-xl:inline">{shortLabel}</span>
            </>
          ) : (
            label
          )
        }
      />
    </DetailPart>
  );
}
