import { SURFACE_PANEL } from "@/ui/tokens";

export function SupabaseSetupNotice() {
  return (
    <p className={`${SURFACE_PANEL} px-4 py-3 type-body text-ink-body`}>
      Configure the Supabase variables in .env.local first
    </p>
  );
}
