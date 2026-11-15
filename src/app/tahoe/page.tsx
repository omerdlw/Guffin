import type { JSX } from "react";
import type { Metadata } from "next";

const WALLPAPER =
  "https://static1.squarespace.com/static/5e949a92e17d55230cd1d44f/t/684c867aae56d87f60e88af1/1749845662143/macOS_Tahoe_Light.jpg";

export const metadata: Metadata = {
  robots: { index: false },
  title: "Tahoe",
};

// A bare page: only the wallpaper, for seeing the glass over a bright scene.
export default function TahoePage(): JSX.Element {
  return (
    <main
      className="fixed inset-0 bg-cover bg-center bg-no-repeat"
      id="main"
      style={{ backgroundImage: `url(${WALLPAPER})` }}
    />
  );
}
