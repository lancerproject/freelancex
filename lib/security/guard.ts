import { getClientIp, getDeviceInfo, isLocalOrPrivateIp } from "./context";
import { ipQualityScore, abuseIpdb, ipCountry } from "./ip-intel";
import {
  isIpBlacklisted,
  addIpToBlacklist,
  logIpCheck,
  logSecurityEvent,
  createFraudAlert,
  countAccountsForIp,
} from "./store";
import { suspendAccount, statusBlockMessage } from "./suspend";
import { isDisposableEmail } from "./temp-email";
import { addViolation } from "@/lib/health";

const ABUSE_THRESHOLD = 50; // AbuseIPDB confidence % that triggers a block
const MULTI_ACCOUNT_THRESHOLD = 3; // >3 accounts from one IP = flag

export type GuardResult = { blocked: boolean; message?: string };

const OK: GuardResult = { blocked: false };

/* ---------- pre-auth (runs before creating/authenticating) ---------- */

// Blacklist + disposable-email gate. Call BEFORE signUp / signInWithPassword.
export async function preAuthGuard(email?: string): Promise<GuardResult> {
  const ip = await getClientIp();
  if (await isIpBlacklisted(ip)) {
    await logSecurityEvent({
      eventType: "blacklist_block",
      description: "Blacklisted IP attempted access",
      ip,
    });
    return {
      blocked: true,
      message: "Access from your network is not permitted on Xwork.",
    };
  }
  if (email && isDisposableEmail(email)) {
    await logSecurityEvent({
      eventType: "disposable_email_block",
      description: `Disposable email domain: ${email.split("@")[1] ?? ""}`,
      ip,
    });
    return {
      blocked: true,
      message:
        "Please register with a permanent email address. Temporary/disposable email addresses aren't allowed.",
    };
  }
  return OK;
}

/* ---------- IP intelligence (VPN / proxy / Tor / abuse) ---------- */

async function runIpIntel(
  userId: string,
  phase: "register" | "login"
): Promise<GuardResult> {
  const ip = await getClientIp();
  const device = await getDeviceInfo();

  // Can't classify localhost / private IPs (local dev) — skip cleanly.
  if (isLocalOrPrivateIp(ip)) return OK;

  const iqConfigured = !!process.env.IPQUALITYSCORE_API_KEY;
  const abConfigured = !!process.env.ABUSEIPDB_API_KEY;
  const iq = await ipQualityScore(ip!);
  const ab = await abuseIpdb(ip!);

  await logIpCheck({
    userId,
    ip,
    vpn: iq?.vpn ?? null,
    proxy: iq?.proxy ?? null,
    tor: iq?.tor ?? null,
    abuseScore: ab?.abuseScore ?? null,
    source: iq ? "ipqualityscore" : ab ? "abuseipdb" : "fallback",
  });

  // Feature 3 — VPN / proxy / Tor → permanent suspension + IP blacklist.
  if (iq && (iq.vpn || iq.proxy || iq.tor)) {
    await suspendAccount({
      userId,
      status: "permanently_suspended",
      reason: "vpn_proxy_detected",
      details: { vpn: iq.vpn, proxy: iq.proxy, tor: iq.tor, isp: iq.isp, phase },
      ip,
      device,
    });
    await addIpToBlacklist(ip!, "vpn_proxy_detected");
    return { blocked: true, message: statusBlockMessage("permanently_suspended") };
  }

  // Feature 2 — abusive/spam IP (AbuseIPDB ≥ 50%) → permanent suspension + blacklist.
  if (ab && ab.abuseScore != null && ab.abuseScore >= ABUSE_THRESHOLD) {
    await suspendAccount({
      userId,
      status: "permanently_suspended",
      reason: "suspicious_ip_detected",
      details: { abuseScore: ab.abuseScore, phase },
      ip,
      device,
    });
    await addIpToBlacklist(ip!, "suspicious_ip_detected");
    return { blocked: true, message: statusBlockMessage("permanently_suspended") };
  }

  // Configured but every provider errored/timed out → allow, but flag for review.
  const iqFailed = iqConfigured && !iq;
  const abFailed = abConfigured && !ab;
  if ((iqConfigured || abConfigured) && iqFailed && abFailed) {
    await logSecurityEvent({
      userId,
      eventType: "ip_intel_unavailable",
      description: "IP intelligence providers unreachable — allowed, flagged for review",
      ip,
      device,
    });
    await createFraudAlert({
      userId,
      alertType: "ip_intel_unavailable",
      details: { ip, phase },
    });
  }
  return OK;
}

/* ---------- register ---------- */

// After the account is created. Logs the registration, runs IP intel, and
// flags multi-account-from-one-IP for admin review.
export async function postRegisterChecks(userId: string): Promise<GuardResult> {
  const ip = await getClientIp();
  const device = await getDeviceInfo();
  await logSecurityEvent({ userId, eventType: "register", ip, device });

  // Feature 2 — more than N accounts from one IP → flag all for admin (no block).
  const accounts = await countAccountsForIp(ip);
  if (accounts > MULTI_ACCOUNT_THRESHOLD) {
    await createFraudAlert({
      userId,
      alertType: "multiple_accounts_same_ip",
      details: { ip, accountsFromIp: accounts },
    });
    // Account health: record the violation (deduped) and recalculate.
    try {
      await addViolation({
        userId,
        type: "multiple_accounts_ip",
        metadata: { ip, accountsFromIp: accounts },
      });
    } catch {
      /* best-effort */
    }
  }

  return runIpIntel(userId, "register");
}

/* ---------- login ---------- */

// After a successful password sign-in: block if the account is already
// suspended/flagged, otherwise run IP intel.
export async function postLoginChecks(
  userId: string,
  accountStatus?: string | null
): Promise<GuardResult> {
  if (
    accountStatus === "suspended" ||
    accountStatus === "permanently_suspended" ||
    accountStatus === "flagged"
  ) {
    const ip = await getClientIp();
    await logSecurityEvent({
      userId,
      eventType: "login_blocked",
      description: `status=${accountStatus}`,
      ip,
    });
    return { blocked: true, message: statusBlockMessage(accountStatus) };
  }
  await logSecurityEvent({ userId, eventType: "login", ip: await getClientIp() });
  return runIpIntel(userId, "login");
}

/* ---------- identity verification (country mismatch) ---------- */

function sameCountry(a?: string | null, b?: string | null): boolean | null {
  if (!a || !b) return null; // unknown → can't compare
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Feature 1 — country mismatch. `docCountry` is the ID's issuing country.
// Clear identity fraud = the document country differs from the profile country
// (e.g. profile says United States, ID is Pakistani) → suspend. If only the IP
// differs (travel/VPN) we don't hard-suspend here (VPN is handled separately) —
// we raise an admin flag instead.
export async function checkCountryMismatch(params: {
  userId: string;
  profileCountry?: string | null;
  docCountry?: string | null;
}): Promise<GuardResult> {
  const { userId, profileCountry, docCountry } = params;
  const ip = await getClientIp();
  const device = await getDeviceInfo();
  const ipc = isLocalOrPrivateIp(ip) ? null : await ipCountry(ip!);
  const ipCountryName = ipc?.name ?? null;

  const docVsProfile = sameCountry(docCountry, profileCountry);
  const docVsIp = sameCountry(docCountry, ipCountryName);
  const profileVsIp = sameCountry(profileCountry, ipCountryName);

  // Document country ≠ profile country → identity fraud → suspend.
  if (docVsProfile === false) {
    await suspendAccount({
      userId,
      status: "suspended",
      reason: "identity_country_mismatch",
      details: {
        profileCountry,
        docCountry,
        ipCountry: ipCountryName,
      },
      ip,
      device,
    });
    return { blocked: true, message: statusBlockMessage("suspended") };
  }

  // Doc==Profile but IP disagrees with both → likely travel/VPN → flag, no block.
  if (docVsIp === false && profileVsIp === false) {
    await createFraudAlert({
      userId,
      alertType: "verification_ip_country_mismatch",
      details: { profileCountry, docCountry, ipCountry: ipCountryName },
    });
    await logSecurityEvent({
      userId,
      eventType: "verification_ip_country_mismatch",
      description: `profile=${profileCountry} doc=${docCountry} ip=${ipCountryName}`,
      ip,
      device,
    });
  }
  return OK;
}

// Records a failed identity-verification attempt and, after 3 failures in 24h,
// flags the account and reports whether verification should be locked.
export async function recordVerificationFailure(
  userId: string,
  reason: string
): Promise<{ locked: boolean }> {
  const ip = await getClientIp();
  await logSecurityEvent({
    userId,
    eventType: "verification_failed",
    description: reason,
    ip,
  });
  const { failuresInLast24h } = await countRecentVerificationFailures(userId);
  if (failuresInLast24h >= 3) {
    await createFraudAlert({
      userId,
      alertType: "repeated_verification_failures",
      details: { failuresInLast24h },
    });
    // Account health: record the repeated-failure violation (deduped).
    try {
      await addViolation({
        userId,
        type: "identity_failed_3x",
        metadata: { failuresInLast24h },
      });
    } catch {
      /* best-effort */
    }
    return { locked: true };
  }
  return { locked: false };
}

export async function countRecentVerificationFailures(
  userId: string
): Promise<{ failuresInLast24h: number }> {
  try {
    const { createAdminClient } = await import("@/lib/supabase-admin");
    const admin = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await admin
      .from("security_events_log")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", "verification_failed")
      .gte("created_at", since);
    return { failuresInLast24h: (data ?? []).length };
  } catch {
    return { failuresInLast24h: 0 };
  }
}
