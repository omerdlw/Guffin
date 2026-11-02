"use client";

import { DetailCount } from "@/features/detail";

const years = (count: number) => `${count} years`;

// An age counted up as its fact row comes in, and again on hover.
export function AgeCount({ index, value }: { index: number; value: number }) {
  return (
    <DetailCount
      format={years}
      hover
      index={index}
      part="value"
      value={value}
    />
  );
}
