import type { MetadataRoute } from "next";
import { project } from "@/lib/project";

const BLOCKED_BOTS = [
  "AhrefsBot",
  "Amazonbot",
  "anthropic-ai",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "ClaudeBot",
  "Claude-Web",
  "cohere-ai",
  "DataForSeoBot",
  "Diffbot",
  "DotBot",
  "FacebookBot",
  "Google-Extended",
  "GPTBot",
  "ImagesiftBot",
  "meta-externalagent",
  "MJ12bot",
  "OAI-SearchBot",
  "omgili",
  "PerplexityBot",
  "PetalBot",
  "SemrushBot",
  "Timpibot",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { disallow: "/", userAgent: BLOCKED_BOTS },
      { allow: "/", disallow: ["/api/", "/auth/"], userAgent: "*" },
    ],
    sitemap: `${project.url}/sitemap.xml`,
  };
}
