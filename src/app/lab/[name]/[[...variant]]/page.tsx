import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EngineLab } from "@/app/lab/engine";
import { KitLab } from "@/app/lab/kit";

type Params = Promise<{ name: string; variant?: string[] }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { name, variant } = await params;
  const title =
    name === "kit" ? "Kit lab" : variant ? "Engine lab · B" : "Engine lab";
  return { robots: { index: false }, title };
}

export default async function LabPage({
  params,
}: {
  params: Params;
}): Promise<JSX.Element> {
  if (process.env.NODE_ENV === "production") notFound();
  const { name, variant } = await params;
  if (name === "kit" && !variant) return <KitLab />;
  if (name === "engine" && !variant) return <EngineLab variant="a" />;
  if (name === "engine" && variant?.length === 1 && variant[0] === "b")
    return <EngineLab variant="b" />;
  notFound();
}
