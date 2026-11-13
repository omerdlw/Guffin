import type { UserIdentity } from "@supabase/supabase-js";
import type { OAuthProvider } from "@/features/auth/session";
import {
  BROWSER_PATTERNS,
  DEVICE_ICONS,
  DEVICE_PATTERNS,
  LOCALHOST_ADDRESSES,
  SHORT_DATE_FORMAT,
} from "./constants";
import type { AuthSession } from "./types";

export function providerOf(identity: UserIdentity): OAuthProvider | null {
  const name = identity.provider.trim().toLowerCase();
  if (name === "google" || name === "google.com") return "google";
  if (name === "github" || name === "github.com") return "github";
  if (["x", "x.com", "twitter", "twitter.com"].includes(name)) return "x";
  return null;
}

export function describeDevice(userAgent: string | null): {
  icon: string;
  title: string;
} {
  if (!userAgent) {
    return { icon: "solar:monitor-smartphone-bold", title: "Unknown session" };
  }
  const [, label, kind] = DEVICE_PATTERNS.find(([pattern]) =>
    pattern.test(userAgent),
  ) ?? [null, "Desktop", "desktop"];
  const browser =
    BROWSER_PATTERNS.find(([matches]) => matches(userAgent))?.[1] ??
    "Web browser";
  const icon =
    DEVICE_ICONS[kind] ??
    (label === "Windows" || label === "Linux"
      ? "solar:monitor-bold"
      : "solar:laptop-minimalistic-bold");
  return { icon, title: `${browser} on ${label}` };
}

function describeActivity(session: AuthSession): string {
  if (session.is_current) return "Active now";
  const value = session.last_seen_at || session.created_at;
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Active session";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Active just now";
  if (seconds < 3600)
    return `Active ${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `Active ${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `Active ${Math.floor(seconds / 86400)}d ago`;
  return `Active ${SHORT_DATE_FORMAT.format(date)}`;
}

export function describeSession(session: AuthSession): string {
  const ip = session.ip_address?.trim();
  const place = ip ? (LOCALHOST_ADDRESSES.has(ip) ? "Localhost" : ip) : null;
  return [place, describeActivity(session)].filter(Boolean).join(" • ");
}
