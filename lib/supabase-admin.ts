import { createClient } from "@supabase/supabase-js";

// Service-role client for read-only aggregates that must bypass RLS
// (e.g. counting a client's hires across contracts the viewer can't see).
// Never expose this to the browser — server-only.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
