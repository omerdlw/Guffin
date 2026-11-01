"use client";

import { Count } from "@/motion/stage";
import { formatMoney } from "../utils";

export function MoneyCount({ since, value }: { since: number; value: number }) {
  return (
    <Count
      since={since}
      format={(amount) => formatMoney(amount) ?? "$0"}
      hover
      value={value}
    />
  );
}
