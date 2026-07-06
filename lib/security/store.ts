import { createAdminClient } from "@/lib/supabase-admin";

// Service-role data access for the security/fraud tables (RLS blocks the anon
// client). Every write is best-effort and wrapped so a logging failure can
// never break the login/register/verification flow. Server-only.

export async function isIpBlacklisted(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ip_blacklist")
      .select("id")
      .eq("ip_address", ip)
      .maybeSingle();
    return !!data;
  } catch {
    return false; // fail open — never lock everyone out on a DB hiccup
  }
}

export async function addIpToBlacklist(
  ip: string,
  reason: string,
  addedBy = "system"
): Promise<void> {
  if (!ip) return;
  try {
    const admin = createAdminClient();
    await admin
      .from("ip_blacklist")
      .upsert({ ip_address: ip, reason, added_by: addedBy }, { onConflict: "ip_address" });
  } catch {
    /* best effort */
  }
}

export async function removeIpFromBlacklist(ip: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ip_blacklist").delete().eq("ip_address", ip);
  } catch {
    /* best effort */
  }
}

export async function logIpCheck(row: {
  userId?: string | null;
  ip: string | null;
  vpn?: boolean | null;
  proxy?: boolean | null;
  tor?: boolean | null;
  abuseScore?: number | null;
  source: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ip_checks_log").insert({
      user_id: row.userId ?? null,
      ip_address: row.ip,
      vpn_detected: row.vpn ?? null,
      proxy_detected: row.proxy ?? null,
      tor_detected: row.tor ?? null,
      abuse_score: row.abuseScore ?? null,
      check_source: row.source,
    });
  } catch {
    /* best effort */
  }
}

export async function logSecurityEvent(row: {
  userId?: string | null;
  eventType: string;
  description?: string;
  ip?: string | null;
  device?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_events_log").insert({
      user_id: row.userId ?? null,
      event_type: row.eventType,
      description: row.description ?? null,
      ip_address: row.ip ?? null,
      device_info: row.device ?? null,
    });
  } catch {
    /* best effort */
  }
}

export async function createFraudAlert(row: {
  userId?: string | null;
  alertType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("fraud_alerts").insert({
      user_id: row.userId ?? null,
      alert_type: row.alertType,
      details: row.details ?? {},
      status: "pending",
    });
  } catch {
    /* best effort */
  }
}

// How many distinct accounts have registered from this IP (multi-account signal).
export async function countAccountsForIp(ip: string | null): Promise<number> {
  if (!ip) return 0;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("security_events_log")
      .select("user_id")
      .eq("event_type", "register")
      .eq("ip_address", ip);
    return new Set((data ?? []).map((r) => r.user_id).filter(Boolean)).size;
  } catch {
    return 0;
  }
}

// Admin: list fraud alerts (newest first).
export async function listFraudAlerts(status?: string) {
  try {
    const admin = createAdminClient();
    let q = admin
      .from("fraud_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) q = q.eq("status", status);
    const { data } = await q;
    return data ?? [];
  } catch {
    return [];
  }
}
