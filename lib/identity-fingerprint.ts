import { createHash } from "crypto";

// Builds a stable, non-reversible fingerprint of a person's ID document, used
// to enforce one verified account per identity. We hash the normalized ID
// number together with the date of birth — the same document always yields the
// same fingerprint, but the raw number is never exposed.
export function identityFingerprint(idNumber: string, dob: string): string {
  const num = (idNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const d = (dob || "").trim();
  return createHash("sha256").update(`${num}|${d}`).digest("hex");
}
