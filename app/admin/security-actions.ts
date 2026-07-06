"use server";

import { createClient } from "@/lib/supabase-server";
import {
  listFraudAlerts,
  addIpToBlacklist,
  removeIpFromBlacklist,
} from "@/lib/security/store";

// Only admins may touch the fraud/blacklist data. (The admin review UI is
// built separately later; these are the backing actions.)
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return me?.is_admin ? user : null;
}

// GET /api/admin/fraud-alerts (equivalent)
export async function adminListFraudAlerts(status?: string) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, error: "Not authorized." };
  return { ok: true as const, alerts: await listFraudAlerts(status) };
}

// POST /api/admin/ip-blacklist (equivalent)
export async function adminAddIpBlacklist(ip: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, error: "Not authorized." };
  if (!ip?.trim()) return { ok: false as const, error: "IP address is required." };
  await addIpToBlacklist(ip.trim(), reason || "manual", admin.id);
  return { ok: true as const };
}

// DELETE /api/admin/ip-blacklist/:ip (equivalent)
export async function adminRemoveIpBlacklist(ip: string) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, error: "Not authorized." };
  if (!ip?.trim()) return { ok: false as const, error: "IP address is required." };
  await removeIpFromBlacklist(ip.trim());
  return { ok: true as const };
}
