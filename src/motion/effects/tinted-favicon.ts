"use client";

import { useEffect } from "react";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/ui/logo";
import { useEngine } from "../engine/react";
import { gradeOf, rgbOf, type Tint } from "../engine/tint";

const iconFor = (tint: Tint) => {
  const c = `rgb(${rgbOf(tint).join(",")})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0a0a0a"/><rect width="64" height="64" rx="16" fill="${c}" fill-opacity="0.18"/><svg x="14" y="14" width="36" height="36" viewBox="${LOGO_VIEWBOX}"><path fill="${c}" d="${LOGO_PATH}"/></svg></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

// What a link pointed to before it took the room's color.
const UNTINTED = "data-untinted";

// Found again each time: the framework may put new links in the head.
const icons = () => [
  ...document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"),
];

function paint(tint: Tint | null) {
  const href = tint ? iconFor(tint) : null;
  for (const link of icons()) {
    const untinted = link.getAttribute(UNTINTED);
    if (href) {
      if (untinted === null)
        link.setAttribute(UNTINTED, JSON.stringify([link.href, link.type]));
      link.type = "image/svg+xml";
      link.href = href;
    } else if (untinted !== null) {
      const [original, type] = JSON.parse(untinted) as [string, string];
      link.href = original;
      link.type = type;
      link.removeAttribute(UNTINTED);
    }
  }
}

// The tab's icon takes the room's color: the tint the room is going to, set
// once rather than every frame of the crossfade. A dark room gives the icon
// back.
export function TintedFavicon() {
  const engine = useEngine();

  useEffect(() => {
    const { target } = gradeOf(engine);
    paint(target.get());
    const stop = target.subscribe(paint);
    return () => {
      stop();
      paint(null);
    };
  }, [engine]);

  return null;
}
