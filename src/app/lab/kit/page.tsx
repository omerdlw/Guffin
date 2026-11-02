import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitLab } from "./view";

export const metadata: Metadata = {
  robots: { index: false },
  title: "Kit lab",
};

export default function KitLabPage(): JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitLab />;
}
