import { headers } from "next/headers";

// Best-effort client IP + device info from the request headers. Server-only.
// Used by the fraud/security checks on register/login/verification.

export async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) {
      // x-forwarded-for: "client, proxy1, proxy2" — the first is the real client.
      const first = fwd.split(",")[0]?.trim();
      if (first) return first;
    }
    return h.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

export async function getDeviceInfo(): Promise<string | null> {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    return ua ? ua.slice(0, 400) : null;
  } catch {
    return null;
  }
}

// Loopback / private IPs from local dev — external intel APIs can't classify
// these, so we treat them as "unknown" and never block on them.
export function isLocalOrPrivateIp(ip: string | null): boolean {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("::ffff:127.") ||
    ip === "localhost"
  );
}
