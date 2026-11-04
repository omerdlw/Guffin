import type { SETTINGS_SECTIONS } from "./constants";

export type SaveResult =
  | { success: true; username: string }
  | { error: string; success: false }
  | null;

export type MediaFormSaveResult =
  { success: true } | { error: string; success: false } | null;

export type MarkTone = "danger" | "lit" | "plain";

export interface AuthSession {
  created_at: string | null;
  ip_address: string | null;
  is_current: boolean;
  last_seen_at: string | null;
  session_id: string;
  user_agent: string | null;
}

export type SettingsSection = keyof typeof SETTINGS_SECTIONS;

export type SettingsKey = SettingsSection | "overview";
