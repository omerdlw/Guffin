"use client";

import { createContext, type JSX, type ReactNode, use } from "react";
import type { MediaType } from "./types";

const MediaTypeContext = createContext<MediaType>("movie");

/**
 * The kind of title a detail page is about. Shared film components read it
 * to call the right actions; anything rendered in the dock or a surface gets
 * the type as a prop instead, since those render outside this tree.
 */
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
