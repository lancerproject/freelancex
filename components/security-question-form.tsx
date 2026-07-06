"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveSecurityQuestion,
  verifyCurrentSecurityAnswer,
} from "@/app/settings/security/security-question/actions";
import { SECURITY_QUESTIONS } from "@/lib/security-questions";
import { ForgotSecurityQuestion } from "@/components/forgot-security-question";

const field =
  "w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring";

export function SecurityQuestionForm({ current }: { current: string }) {
  const hasQuestion = !!current;

  // FLOW 2 gating: until the current answer is verified, the new-question
  // fields stay hidden.
  const [verified, setVerified] = useState(!hasQuestion);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentErr, setCurrentErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // New question + answer (FLOW 1, and FLOW 2 after verification).
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const checkCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setCurrentErr(null);
    if (!currentAnswer.trim()) {
      setCurrentErr("Please enter the answer to your current security question.");
      return;
    }
    setChecking(true);
    const res = await verifyCurrentSecurityAnswer(currentAnswer);
    setChecking(false);
    if (res.ok) setVerified(true);
    else
      setCurrentErr(
        "That answer doesn't match your current security question."
      );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);
    // currentAnswer is re-verified server-side on save (only relevant in FLOW 2).
    const res = await saveSecurityQuestion(
      question,
      answer,
      hasQuestion ? currentAnswer : undefined
    );
    if (res.ok) {
      router.push("/settings/security?sq=saved");
      router.refresh();
      return;
    }
    setBusy(false);
    // If the current answer somehow went stale, send them back to step 1.
    if (res.field === "current") {
      setVerified(false);
      setCurrentErr(res.error);
    } else {
      setErr(res.error);
    }
  };

  // ---- FLOW 2, step 1: verify the current answer ----
  if (hasQuestion && !verified) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-5">
        <form onSubmit={checkCurrent} className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Your current security question
            </p>
            <p className="text-foreground mt-1">{current}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Answer to your current question
            </label>
            <input
              value={currentAnswer}
              onChange={(e) => {
                setCurrentAnswer(e.target.value);
                setCurrentErr(null);
              }}
              placeholder="Enter your current answer"
              className={field}
              autoFocus
            />
            {currentErr && (
              <p className="text-sm text-red-500 mt-1">{currentErr}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={checking}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {checking ? "Checking…" : "Continue"}
            </button>
            <Link
              href="/settings/security"
              className="text-foreground font-medium hover:underline"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* FLOW 3 entry — kept OUTSIDE the form above so the password modal's
            own <form> is never nested inside this form (invalid HTML). */}
        <ForgotSecurityQuestion />
      </div>
    );
  }

  // ---- FLOW 1 (set) and FLOW 2, step 2 (verified → set new) ----
  return (
    <form
      onSubmit={save}
      className="rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-5"
    >
      {hasQuestion && (
        <p className="text-sm text-primary">
          ✓ Verified. Choose a new security question and answer below.
        </p>
      )}

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1">
          {hasQuestion ? "New security question" : "Security question"}
        </label>
        <select
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setErr(null);
          }}
          className={field}
        >
          <option value="">Choose a question…</option>
          {SECURITY_QUESTIONS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1">
          {hasQuestion ? "New answer" : "Your answer"}
        </label>
        <input
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setErr(null);
          }}
          placeholder="Type your answer"
          className={field}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Not case-sensitive. For your security, we store only an encrypted
          version of your answer — never the answer itself.
        </p>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !question || answer.trim().length < 2}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <Link
          href="/settings/security"
          className="text-foreground font-medium hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
