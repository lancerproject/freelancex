import { createAdminClient } from "@/lib/supabase-admin";

// Loads a user's OWN full profile row via the service-role client.
//
// The `authenticated` Postgres role is restricted so it cannot read sensitive
// profile columns (email, phone, address, card/stripe/paypal, tax, ID-doc
// paths, security answers, OTP hashes, notification/2FA prefs) — this closes
// the cross-tenant PII read (pentest C-2b). But a signed-in user legitimately
// needs to see ALL of their OWN fields on settings/billing/profile pages, so
// those owner-self reads route through here (service role), always scoped to
// the caller's own id. NEVER call this with another user's id.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadOwnProfile(id: string): Promise<any | null> {
  if (!id) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
