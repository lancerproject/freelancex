"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetSecurityQuestionWithToken } from "@/app/settings/security/security-question/actions";
import { SECURITY_QUESTIONS } from "@/lib/security-questions";

const field =
  "w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring";

// FLOW 3b: set a brand-new question via the verified email link — no old answer.
export function SecurityQuestionResetForm({ token }: { token: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);
    const res = await resetSecurityQuestionWithToken(token, question, answer);
    if (res.ok) {
      router.push("/settings/security?sq=reset");
      router.refresh();
      return;
    }
    setBusy(false);
    setErr(res.error);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-5"
    >
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1">
          Security question
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
          Your answer
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
          Not case-sensitive. We store only an encrypted version of your answer.
        </p>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <button
        type="submit"
        disabled={busy || !question || answer.trim().length < 2}
        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save new security question"}
      </button>
    </form>
  );
}
