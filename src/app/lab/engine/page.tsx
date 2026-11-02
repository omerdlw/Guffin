import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EngineLab } from "./view";

export const metadata: Metadata = {
  robots: { index: false },
  title: "Engine lab",
};

export default function EngineLabPage(): JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <EngineLab variant="a" />;
}
