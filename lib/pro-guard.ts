"use server";

// Server-side Pro gate. Use at the top of any server action that must be
// Pro-only — never trust the client. Returns the current user + profile when
// the caller is an active Pro freelancer, otherwise { ok: false }.

import { createClient } from "./supabase-server";
import { loadOwnProfile } from "./own-profile";
import { getMembership } from "./membership";

export async function requirePro(): Promise<{
  ok: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // Own-row read via the service role — a `select("*")` as the authenticated
  // role is denied now that PII columns are revoked from it.
  const profile = await loadOwnProfile(user.id);

  const membership = getMembership(profile);
  if (!membership.isPro) return { ok: false, supabase, user, profile };

  return { ok: true, supabase, user, profile };
}
