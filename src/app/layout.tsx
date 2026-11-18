import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import { connection } from "next/server";
import { Z_INDEX } from "@/design/foundations/z-index";
import { project } from "@/lib/project";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
});

const zuume = localFont({
  src: [
    {
      path: "../design/fonts/zuume-bold.woff2",
      style: "normal",
      weight: "700",
    },
  ],
  variable: "--font-zuume",
});

export const metadata: Metadata = {
  description: project.description,
  metadataBase: new URL(project.url),
  title: {
    default: project.name,
    template: "%s",
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  await connection();

  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geist.className} ${zuume.variable} bg-page text-ink antialiased`}
        suppressHydrationWarning
      >
        <a
          className="sr-only rounded-full bg-page px-4 py-2 type-body font-medium text-ink focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4"
          href="#main"
          style={{ zIndex: Z_INDEX.TOOLTIP }}
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
