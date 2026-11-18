import type { JSX } from "react";
import type { Metadata } from "next";
import { UiLab } from "./lab";

const WALLPAPER =
  "https://static1.squarespace.com/static/5e949a92e17d55230cd1d44f/t/684c867aae56d87f60e88af1/1749845662143/macOS_Tahoe_Light.jpg";

export const metadata: Metadata = {
  robots: { index: false },
  title: "UI Lab",
};

export default function TahoePage(): JSX.Element {
  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${WALLPAPER})` }}
      />
      <UiLab wallpaper={WALLPAPER} />
    </div>
  );
}
