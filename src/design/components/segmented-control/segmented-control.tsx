"use client";

import { DockSurfaceExtension } from "@omerdlw/base-framework/modules/dock";
import { cn } from "../../foundations/cn";
import { Button } from "../button";
import { Icon } from "../icon";
import { SlidingPill, useSlidingPill } from "../indicator";
import {
  segmentedControlVariants,
  type SegmentedControlVariants,
  segmentPillVariants,
  segmentVariants,
} from "./variants";

export interface SegmentedItem<K extends string> {
  /** A count after the label, shown when above zero. */
  count?: number;
  icon?: string;
  key: K;
  label: string;
}

export interface SegmentedControlProps<
  K extends string,
> extends SegmentedControlVariants {
  ariaLabel?: string;
  className?: string;
  items: readonly SegmentedItem<K>[];
  onChange: (key: K) => void;
  value: K;
}

const GLYPH = { md: 14, sm: 12 } as const;

/**
 * Tabs that switch a view in place.
 *
 *   <SegmentedControl items={…} value={tab} onChange={setTab} />
 *   <SegmentedControl items={…} value={tab} onChange={setTab} size="md" width="fill" />
 */
export function SegmentedControl<K extends string>({
  ariaLabel,
  className,
  items,
  onChange,
  shape,
  size,
  value,
  width,
}: SegmentedControlProps<K>) {
  const { box: pill, ref: listRef } = useSlidingPill<HTMLDivElement>(
    "[data-pill-target]",
    value,
  );

  if (items.length === 0) return null;

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        segmentedControlVariants({ shape, size, width }),
        className,
      )}
      ref={listRef}
      role="tablist"
    >
      {pill ? (
        <SlidingPill box={pill} className={segmentPillVariants({ shape })} />
      ) : null}
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Button
            aria-selected={active}
            className={cn(
              segmentVariants({ active, shape, size, width }),
              active && !pill && "bg-grade/15",
            )}
            data-pill-target={active ? "" : undefined}
            key={item.key}
            onClick={() => onChange(item.key)}
            role="tab"
          >
            {item.icon ? (
              <Icon icon={item.icon} size={GLYPH[size ?? "sm"]} />
            ) : null}
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 ? (
              <span className="-ml-0.5 tabular-nums">{item.count}</span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}

/** A segmented control mounted in the dock surface's extension bar. */
export function SurfaceSegmentedControl<K extends string>({
  align = "center",
  id,
  ...props
}: SegmentedControlProps<K> & {
  align?: "center" | "left" | "right";
  id: string;
}) {
  return (
    <DockSurfaceExtension align={align} id={id}>
      <SegmentedControl {...props} />
    </DockSurfaceExtension>
  );
}
