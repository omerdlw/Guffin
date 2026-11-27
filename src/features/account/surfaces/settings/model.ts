import { ui } from "@/design/ui";

export interface AuthSession {
  created_at: string | null;
  ip_address: string | null;
  is_current: boolean;
  last_seen_at: string | null;
  session_id: string;
  user_agent: string | null;
}

export const FIELD_CLASS = ui.parts.input.field({
  className: "w-full resize-none type-body",
});

export const INPUT_CLASS = `${FIELD_CLASS} h-10 px-4`;
