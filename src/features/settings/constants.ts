import type { OAuthProvider } from "@/features/auth/types";
import type { MarkTone, SettingsKey } from "./types";
import { SURFACE_FIELD, SURFACE_PRIMARY } from "@/ui/tokens";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;

export const USERNAME_ERROR =
  "Username must be 3-30 characters and contain letters, numbers, _ or -";

export const DEFAULT_BANNER_POSITION = "center 45%";

export const PROVIDER_LABELS: Record<
  OAuthProvider,
  { icon: string; label: string }
> = {
  github: { icon: "mdi:github", label: "GitHub" },
  google: { icon: "flat-color-icons:google", label: "Google" },
  x: { icon: "simple-icons:x", label: "X" },
};

export const DELETE_CONFIRMATION = "DELETE";

const FIELD_CLASS = `${SURFACE_FIELD} w-full resize-none type-body`;

export const INPUT_CLASS = `${FIELD_CLASS} h-10 px-4`;

export const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-36 p-4`;

export const SUBMIT_CLASS = `${SURFACE_PRIMARY} w-full`;

export const MARK_TONE_CLASS: Record<MarkTone, string> = {
  danger: "bg-danger/15 text-danger",
  lit: "bg-grade/15 text-grade",
  plain:
    "bg-fill text-ink-body group-hover:bg-fill-hover group-focus-visible:bg-fill-hover group-has-focus-visible:bg-fill-hover group-hover:text-ink group-focus-visible:text-ink group-has-focus-visible:text-ink",
};

export const DEVICE_PATTERNS: [
  RegExp,
  string,
  "desktop" | "mobile" | "tablet",
][] = [
  [/iPhone/i, "iPhone", "mobile"],
  [/iPad/i, "iPad", "tablet"],
  [/Android.*Mobile/i, "Android", "mobile"],
  [/Android/i, "Android tablet", "tablet"],
  [/Macintosh|Mac OS X/i, "macOS", "desktop"],
  [/Windows/i, "Windows", "desktop"],
  [/CrOS/i, "Chromebook", "desktop"],
  [/Linux/i, "Linux", "desktop"],
];

export const BROWSER_PATTERNS: [(userAgent: string) => boolean, string][] = [
  [(ua) => /Arc\//i.test(ua), "Arc"],
  [(ua) => /Edg\//i.test(ua), "Edge"],
  [(ua) => /OPR\/|Opera/i.test(ua), "Opera"],
  [(ua) => /Brave/i.test(ua), "Brave"],
  [(ua) => /Vivaldi/i.test(ua), "Vivaldi"],
  [(ua) => /SamsungBrowser/i.test(ua), "Samsung Internet"],
  [(ua) => /CriOS\//i.test(ua), "Chrome"],
  [(ua) => /FxiOS\//i.test(ua), "Firefox"],
  [(ua) => /Chrome\//i.test(ua) && !/Chromium/i.test(ua), "Chrome"],
  [(ua) => /Firefox\//i.test(ua), "Firefox"],
  [
    (ua) =>
      /Version\/[0-9.]+.*Safari/i.test(ua) ||
      (/Safari/i.test(ua) && /Apple/i.test(ua)),
    "Safari",
  ],
];

export const LOCALHOST_ADDRESSES = new Set([
  "::1",
  "127.0.0.1",
  "::ffff:127.0.0.1",
]);

export const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

export const SETTINGS_SECTIONS = {
  "avatar-banner": {
    description: "Photo, banner and page background",
    icon: "solar:gallery-bold",
    title: "Avatar & Banners",
  },
  account: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  email: {
    description: "The address you sign in with",
    icon: "solar:letter-bold",
    title: "Email sign-in",
  },
  providers: {
    description: "Google, GitHub and X",
    icon: "solar:link-bold",
    title: "Connected providers",
  },
  sessions: {
    description: "Devices signed in to your account",
    icon: "solar:devices-bold",
    title: "Active sessions",
  },
  passkeys: {
    description: "Sign in with your device",
    icon: "solar:key-bold",
    title: "Passkeys",
  },
  delete: {
    description: "Remove your account for good",
    icon: "solar:trash-bin-trash-bold",
    title: "Delete account",
  },
} as const;

export const SETTINGS_OVERVIEW = {
  icon: "solar:settings-bold",
  title: "Account settings",
};

export const SECURITY_SECTIONS: readonly SettingsKey[] = [
  "passkeys",
  "providers",
  "sessions",
];
