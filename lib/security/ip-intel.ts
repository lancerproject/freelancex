// External IP-intelligence lookups. Every call has a 5s timeout and returns a
// safe fallback (null / undefined fields) on error, missing API key, or
// timeout — so the login/register flow is NEVER blocked by a slow or
// unconfigured third-party API. Server-only.

const TIMEOUT_MS = 5000;

export type IpQualityResult = {
  vpn: boolean;
  proxy: boolean;
  tor: boolean;
  fraudScore: number | null;
  isp: string | null;
  source: "ipqualityscore";
} | null;

export type AbuseResult = {
  abuseScore: number | null; // 0..100
  source: "abuseipdb";
} | null;

// IPQualityScore — VPN / proxy / Tor detection.
export async function ipQualityScore(ip: string): Promise<IpQualityResult> {
  const key = process.env.IPQUALITYSCORE_API_KEY;
  if (!key) return null; // not configured → skip (no-op, like email)
  try {
    const res = await fetch(
      `https://ipqualityscore.com/api/json/ip/${key}/${encodeURIComponent(ip)}?strictness=1`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.success) return null;
    return {
      vpn: !!d.vpn,
      proxy: !!d.proxy,
      tor: !!d.tor,
      fraudScore: typeof d.fraud_score === "number" ? d.fraud_score : null,
      isp: d.ISP ?? null,
      source: "ipqualityscore",
    };
  } catch {
    return null; // timeout / network / parse error → fallback
  }
}

// AbuseIPDB — abuse confidence score (0..100).
export async function abuseIpdb(ip: string): Promise<AbuseResult> {
  const key = process.env.ABUSEIPDB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(
        ip
      )}&maxAgeInDays=90`,
      {
        headers: { Key: key, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const score = d?.data?.abuseConfidenceScore;
    return {
      abuseScore: typeof score === "number" ? score : null,
      source: "abuseipdb",
    };
  } catch {
    return null;
  }
}

// ip-api.com (free, no key) — country of an IP address (ISO code + name).
export async function ipCountry(
  ip: string
): Promise<{ code: string | null; name: string | null } | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (d?.status !== "success") return null;
    return { code: d.countryCode ?? null, name: d.country ?? null };
  } catch {
    return null;
  }
}
