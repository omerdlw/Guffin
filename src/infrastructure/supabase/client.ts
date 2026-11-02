import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "@/infrastructure/env";
import { AUTH_COOKIE_NAME } from "./session";
import type { Database } from "./database.types";

export type { Database };

let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const { publishableKey, url } = requireSupabasePublicConfig();
  browserClient = createBrowserClient<Database>(url, publishableKey, {
    auth: {
      experimental: { passkey: true },
      flowType: "pkce",
    },
    cookieOptions: {
      name: AUTH_COOKIE_NAME,
      secure: typeof location !== "undefined" && location.protocol === "https:",
    },
  });

  return browserClient;
}
