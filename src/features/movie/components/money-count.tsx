"use client";

import { MovieCount } from "../motion";
import { formatMoney } from "../utils";

const money = (amount: number) => formatMoney(amount) ?? "$0";

// A sum of money counted up as its fact row comes in, and again on hover.
export function MoneyCount({ index, value }: { index: number; value: number }) {
  return (
    <MovieCount format={money} hover index={index} part="value" value={value} />
  );
}
