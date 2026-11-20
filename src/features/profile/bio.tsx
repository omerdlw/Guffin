"use client";

import { type JSX, useLayoutEffect, useRef, useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { TextButton } from "@/design/components/link";
import { useSurfacePreload } from "@/design/lazy-surface";
import { cn } from "@/design/ui";
import { accountBioSurface } from "@/features/account/surfaces";

const LINES = 3;
const MORE = "read more";
const TEXT =
  "type-body text-justify hyphens-auto [overflow-wrap:anywhere] whitespace-pre-line text-ink-body";
const FITTED = "mx-auto max-w-full [text-align-last:center]";

function fitFor(probe: HTMLElement, full: number): number {
  const height = probe.offsetHeight;
  let low = 1;
  let high = Math.ceil(full);
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    probe.style.width = `${mid}px`;
    if (probe.offsetHeight <= height) high = mid;
    else low = mid + 1;
  }
  probe.style.width = "";
  return high;
}

function cutFor(
  probe: HTMLElement,
  cut: Text,
  more: HTMLElement,
  bio: string,
): number | null {
  const line = parseFloat(getComputedStyle(probe).lineHeight);
  const most = LINES * line + 1;
  cut.data = bio;
  more.hidden = true;
  if (probe.offsetHeight <= most) return null;
  more.hidden = false;

  const fits = (end: number) => {
    cut.data = `${bio.slice(0, end).trimEnd()}… `;
    return probe.offsetHeight <= most;
  };
  let low = 0;
  let high = bio.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(mid)) low = mid;
    else high = mid - 1;
  }
  const space = bio.lastIndexOf(" ", low);
  return space > low * 0.6 ? space : low;
}

type Shape = { cut: number } | { width: number };

export function ProfileBio({
  bio,
  displayName,
  username,
}: {
  bio: string;
  displayName: string;
  username: string;
}): JSX.Element {
  const { openSurface } = useDockActions();
  useSurfacePreload(accountBioSurface);
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLParagraphElement>(null);
  const [shape, setShape] = useState<Shape | null>(null);

  useLayoutEffect(() => {
    const frame = box.current;
    const element = probe.current;
    if (!frame || !element) return;
    const text = document.createTextNode("");
    const more = document.createElement("span");
    more.className = "font-medium";
    more.textContent = MORE;
    element.replaceChildren(text, more);
    let width = -1;
    const measure = () => {
      if (frame.offsetWidth === width) return;
      width = frame.offsetWidth;
      const cut = cutFor(element, text, more, bio);
      setShape(
        cut === null
          ? { width: fitFor(element, element.getBoundingClientRect().width) }
          : { cut },
      );
    };
    measure();
    let live = true;
    void document.fonts.ready.then(() => {
      if (!live) return;
      width = -1;
      measure();
    });
    const sizes = new ResizeObserver(measure);
    sizes.observe(frame);
    return () => {
      live = false;
      sizes.disconnect();
    };
  }, [bio]);

  const open = () =>
    accountBioSurface.open(openSurface, { bio, displayName, username });

  return (
    <div className="relative w-full" ref={box}>
      <p
        aria-hidden="true"
        className={cn(TEXT, "invisible absolute inset-x-0 top-0")}
        ref={probe}
      />
      <p
        className={cn(TEXT, shape && "width" in shape && FITTED)}
        style={shape && "width" in shape ? { width: shape.width } : undefined}
      >
        {!shape || "width" in shape ? (
          bio
        ) : (
          <>
            {`${bio.slice(0, shape.cut).trimEnd()}… `}
            <TextButton
              className="font-medium text-ink"
              onClick={open}
              variant="inline"
            >
              {MORE}
            </TextButton>
          </>
        )}
      </p>
    </div>
  );
}
