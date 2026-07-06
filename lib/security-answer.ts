import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Security-answer hashing. Answers are normalized (trim + lower-case) so
// capitalization/spacing don't matter, then salted + scrypt-hashed. Stored as
// "salt:hash" (both hex). The raw answer is never stored.
export function hashAnswer(answer: string): string {
  const salt = randomBytes(16).toString("hex");
  const norm = answer.trim().toLowerCase();
  const hash = scryptSync(norm, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Constant-time comparison of a candidate answer against a stored "salt:hash".
export function verifyAnswer(
  stored: string | null | undefined,
  answer: string
): boolean {
  if (!stored || !stored.includes(":") || !answer) return false;
  const [salt, hash] = stored.split(":");
  const norm = answer.trim().toLowerCase();
  const computed = scryptSync(norm, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}
