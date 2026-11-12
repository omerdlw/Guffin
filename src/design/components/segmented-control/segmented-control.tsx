"use client";

import { DockSurfaceExtension } from "@omerdlw/base-framework/modules/dock";
import {
  SegmentedControl,
  type SegmentedControlProps,
} from "@omerdlw/base-framework/design";

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
