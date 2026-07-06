"use client";

import { createBrowserClient } from "@supabase/ssr";

// Session-aware browser client (shares the auth cookies), used for realtime
// subscriptions and authenticated inserts from client components.
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
