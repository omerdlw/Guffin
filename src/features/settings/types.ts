import type { MutationResult } from "@/features/auth/types";
import type { SETTINGS_SECTIONS } from "./constants";

export type SaveResult = MutationResult<{ username: string }> | null;

export type MediaFormSaveResult = MutationResult | null;

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
