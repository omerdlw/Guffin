"use client";

import { useEffect } from "react";
import { DOCK_EVENTS } from "@omerdlw/base-framework/dock";
import { globalEvents } from "@omerdlw/base-framework/events";

export default function NotFound(): null {
  useEffect(() => {
    const timer = setTimeout(
      () => globalEvents.emit(DOCK_EVENTS.NOT_FOUND, { path: "not-found" }),
      0,
    );
    return () => {
      clearTimeout(timer);
      globalEvents.emit(DOCK_EVENTS.NOT_FOUND, { clear: true, path: "" });
    };
  }, []);

  return null;
}
