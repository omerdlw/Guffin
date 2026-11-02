"use client";

import { use } from "react";
import { Foil } from "@/motion/effects";
import type { TiltLight } from "@/motion/effects";
import type { Awards } from "@/infrastructure/tmdb/types";
import { wonAcademyAward } from "../utils";

export function AwardFoil({
  awards,
  ...light
}: TiltLight & { awards: Promise<Awards | null> }) {
  const known = use(awards);
  return known && wonAcademyAward(known) ? <Foil {...light} /> : null;
}
