"use server";

import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "crypto";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { SECURITY_QUESTIONS } from "@/lib/security-questions";
import { hashAnswer, verifyAnswer } from "@/lib/security-answer";

const RESET_TTL_MIN = 30;

type SaveResult =
  | { ok: true }
  | { ok: false; error: string; field?: "current" | "question" | "answer" };

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function validateQuestionAnswer(
  question: string,
  answer: string
): { ok: false; error: string; field: "question" | "answer" } | null {
  if (!SECURITY_QUESTIONS.includes(question)) {
    return { ok: false, error: "Please choose a security question.", field: "question" };
  }
  if (answer.length < 2) {
    return {
      ok: false,
      error: "Please enter an answer (at least 2 characters).",
      field: "answer",
    };
  }
  return null;
}

// FLOW 1 (set) & FLOW 2 (change). When a question already exists, the current
// answer must be supplied and must match before the new one is saved.
export async function saveSecurityQuestion(
  question: string,
  answer: string,
  currentAnswer?: string
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  question = (question || "").trim();
  answer = (answer || "").trim();

  const invalid = validateQuestionAnswer(question, answer);
  if (invalid) return invalid;

  const profile = await loadOwnProfile(user.id);

  // FLOW 2: re-verify the current answer server-side (never trust the client).
  if (profile?.security_answer_hash) {
    if (!verifyAnswer(profile.security_answer_hash, currentAnswer || "")) {
      return {
        ok: false,
        error: "That answer doesn't match your current security question.",
        field: "current",
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ security_question: question, security_answer_hash: hashAnswer(answer) })
    .eq("id", user.id);
  if (error) {
    return {
      ok: false,
      error:
        "Couldn't save. Please run the security-question.sql migration in Supabase, then try again.",
    };
  }

  await notify(
    supabase,
    user.id,
    "security",
    "Security question updated",
    "Your security question and answer were updated. If this wasn't you, change your password.",
    "/settings/security"
  );

  revalidatePath("/settings/security");
  return { ok: true };
}

// FLOW 2 gate: check the current answer before revealing the new-question fields.
export async function verifyCurrentSecurityAnswer(
  answer: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const profile = await loadOwnProfile(user.id);
  return { ok: verifyAnswer(profile?.security_answer_hash, answer) };
}

// FLOW 3a: email a single-use, 30-minute reset link. Called after the password
// popup has confirmed the account password.
export async function sendSecurityQuestionReset(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false };

  // Invalidate any earlier unused tokens so only the newest link works.
  await supabase
    .from("security_question_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("used_at", null);

  const raw = randomBytes(32).toString("hex");
  const { error } = await supabase.from("security_question_resets").insert({
    user_id: user.id,
    token_hash: sha256(raw),
    expires_at: new Date(Date.now() + RESET_TTL_MIN * 60_000).toISOString(),
  });
  if (error) return { ok: false };

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${siteUrl}/settings/security/security-question/reset?token=${raw}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your Xwork security question",
    heading: "Reset your security question",
    body: `We received a request to reset your security question. Use the button below to set a new one. This link expires in ${RESET_TTL_MIN} minutes and can only be used once. If you didn't request this, you can safely ignore this email.`,
    ctaLabel: "Reset security question",
    ctaUrl: link,
    type: "account",
  });

  // In-app trace (never contains the token).
  await notify(
    supabase,
    user.id,
    "security",
    "Security question reset requested",
    "We emailed you a link to reset your security question. It expires in 30 minutes. If this wasn't you, change your password.",
    "/settings/security"
  );

  return { ok: true };
}

// FLOW 3b: set a new question via the email link — no old answer required.
export async function resetSecurityQuestionWithToken(
  token: string,
  question: string,
  answer: string
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  question = (question || "").trim();
  answer = (answer || "").trim();

  const invalid = validateQuestionAnswer(question, answer);
  if (invalid) return invalid;

  // Re-validate the token: must belong to this user, be unused, and unexpired.
  const { data: row } = await supabase
    .from("security_question_resets")
    .select("id, expires_at, used_at")
    .eq("user_id", user.id)
    .eq("token_hash", sha256(token))
    .maybeSingle();

  const tokenValid =
    !!row && !row.used_at && new Date(row.expires_at).getTime() > Date.now();
  if (!tokenValid) {
    return {
      ok: false,
      error: "This link has expired or already been used. Please request a new one.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ security_question: question, security_answer_hash: hashAnswer(answer) })
    .eq("id", user.id);
  if (error) {
    return { ok: false, error: "Couldn't save. Please try again." };
  }

  // Single-use: burn the token.
  await supabase
    .from("security_question_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  await notify(
    supabase,
    user.id,
    "security",
    "Security question reset",
    "Your security question was reset via email verification. If this wasn't you, change your password immediately.",
    "/settings/security"
  );

  revalidatePath("/settings/security");
  return { ok: true };
}
