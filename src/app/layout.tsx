import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import { connection } from "next/server";
import { LOADING_HANDOFF_SCRIPT } from "@/design/components/loading-ghost";
import { project } from "@/shared/site";
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
        <script dangerouslySetInnerHTML={{ __html: LOADING_HANDOFF_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
