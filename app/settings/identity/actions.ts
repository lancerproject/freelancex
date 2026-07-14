"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/notify";
import { identityFingerprint } from "@/lib/identity-fingerprint";
import {
  checkCountryMismatch,
  recordVerificationFailure,
  countRecentVerificationFailures,
} from "@/lib/security/guard";

// Tokens shared between the profile name and the name read off the ID.
function nameMatches(profileName: string, idName: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  const a = norm(profileName);
  const b = new Set(norm(idName));
  if (a.length === 0 || b.size === 0) return false;
  const hits = a.filter((t) => b.has(t)).length;
  // At least two name parts (or all of them) must match.
  return hits >= Math.min(2, a.length);
}

export async function verifyIdentity(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  review?: boolean; // true = docs accepted, waiting for manual review
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const frontUrl = String(formData.get("front_url") || "");
  const backUrl = String(formData.get("back_url") || "");
  const selfieUrl = String(formData.get("selfie_url") || "");
  const legalName = String(formData.get("legal_name") || "");
  const faceScore = Number(formData.get("face_score") || 0);
  const idType = String(formData.get("id_type") || "");
  const idNumber = String(formData.get("id_number") || "");
  const idDob = String(formData.get("id_dob") || "");
  const idCountry = String(formData.get("id_country") || "");

  // Security: lock verification after too many failed attempts in 24h.
  const { failuresInLast24h } = await countRecentVerificationFailures(user.id);
  if (failuresInLast24h >= 3) {
    return {
      ok: false,
      error:
        "Too many failed verification attempts. Please try again in 24 hours or contact support@xwork.com.",
    };
  }

  if (!frontUrl || !backUrl || !selfieUrl) {
    return { ok: false, error: "Please upload the ID (front & back) and a selfie." };
  }
  if (!idNumber.trim() || !idDob) {
    return {
      ok: false,
      error: "Please enter your ID document number and date of birth.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, country")
    .eq("id", user.id)
    .maybeSingle();

  // Feature 1 — country mismatch: if the ID's issuing country differs from the
  // profile country, this suspends the account (identity fraud) and blocks here.
  const mismatch = await checkCountryMismatch({
    userId: user.id,
    profileCountry: profile?.country,
    docCountry: idCountry,
  });
  if (mismatch.blocked) {
    return { ok: false, error: mismatch.message };
  }

  if (!nameMatches(profile?.full_name || "", legalName)) {
    await recordVerificationFailure(user.id, "name_mismatch");
    return {
      ok: false,
      error:
        "The name on your ID doesn't match your profile name. Update your profile name to match your ID, then try again.",
    };
  }

  // Face match is a SOFT signal now: a good match auto-verifies; a weak or
  // unavailable one quietly goes to manual review (never a hard rejection).
  // The user is never told the score or that it was low.

  // One verified account per identity. The same ID document can only be
  // verified on one active account at a time; after a permanent suspension it
  // may be reused, up to an internal lifetime cap.
  const fingerprint = identityFingerprint(idNumber, idDob);
  const { data: claim, error: claimErr } = await supabase.rpc("claim_identity", {
    p_fingerprint: fingerprint,
  });
  if (claimErr) {
    return {
      ok: false,
      error: "We couldn't verify your identity right now. Please try again.",
    };
  }
  if (claim === "in_use") {
    return {
      ok: false,
      error:
        "This identity is already verified on another Xwork account. Each person may verify only one account.",
    };
  }
  if (claim !== "ok") {
    // 'banned' | 'limit' | 'error' — never reveal the exact rule publicly.
    return {
      ok: false,
      error:
        "We were unable to verify your identity. If you believe this is a mistake, please contact support.",
    };
  }

  // Auto-verify when the face match is confident enough (≥55%). Otherwise —
  // weak match, or matching couldn't run — the documents go to the MANUAL
  // REVIEW queue and an admin approves/rejects from /admin/identity. Either
  // way the user sees the same "submitted, under review" confirmation.
  const AUTO_VERIFY_MIN = 55;
  const needsReview = !faceScore || faceScore < AUTO_VERIFY_MIN;

  const { error } = await supabase
    .from("profiles")
    .update({
      id_verified: !needsReview,
      id_doc_front: frontUrl,
      id_doc_back: backUrl,
      id_selfie: selfieUrl,
      id_legal_name: legalName,
      id_face_score: faceScore || null,
      id_type: idType || null,
      id_number: idNumber,
      id_dob: idDob,
      identity_fingerprint: fingerprint,
      id_verified_at: needsReview ? null : new Date().toISOString(),
      id_review_status: needsReview ? "pending" : null,
      id_review_note: null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  if (needsReview) {
    await notify(
      supabase,
      user.id,
      "account",
      "Verification submitted",
      "Thank you — your identity verification has been submitted. Our trust & safety team will review it manually, usually within 24 hours. We'll notify you as soon as it's complete.",
      "/settings/identity"
    );
    revalidatePath("/settings/identity");
    return { ok: true, review: true };
  }

  // Clear the pending "Verify your identity" prompt from the bell.
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("link", "/settings/identity");

  // Congrats notification (also emails the user once email is configured).
  await notify(
    supabase,
    user.id,
    "account",
    "Identity verified 🎉",
    "Congratulations — your identity has been verified! You're all set to apply and get paid. Your blue verified badge appears after your first contract.",
    "/profile"
  );

  revalidatePath("/settings/identity");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/profile");
  return { ok: true };
}
