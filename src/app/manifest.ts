import type { MetadataRoute } from "next";
import { project } from "@/lib/project";

const PAGE = "#0a0a0a";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: project.name,
    short_name: project.name,
    description: project.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: PAGE,
    theme_color: PAGE,
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
