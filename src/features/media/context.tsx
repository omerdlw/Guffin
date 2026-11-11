"use client";

import { createContext, type JSX, type ReactNode, use } from "react";
import type { MediaType } from "./types";

const MediaTypeContext = createContext<MediaType>("movie");

export function MediaTypeProvider({
  children,
  mediaType,
}: {
  children: ReactNode;
  mediaType: MediaType;
}): JSX.Element {
  return <MediaTypeContext value={mediaType}>{children}</MediaTypeContext>;
}

export function useMediaType(): MediaType {
  return use(MediaTypeContext);
}
