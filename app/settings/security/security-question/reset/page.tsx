import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { SecurityQuestionResetForm } from "@/components/security-question-reset-form";

export const metadata = { title: "Reset security question | Xwork" };

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export default async function SecurityQuestionResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Reset requires an active session (token + login = two factors).
  if (!user) redirect("/login");

  let valid = false;
  if (token) {
    const { data: row } = await supabase
      .from("security_question_resets")
      .select("expires_at, used_at")
      .eq("user_id", user.id)
      .eq("token_hash", sha256(token))
      .maybeSingle();
    valid =
      !!row && !row.used_at && new Date(row.expires_at).getTime() > Date.now();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Reset your security question
        </h2>
        <p className="text-muted-foreground mt-1">
          Set a new security question and answer. You won&apos;t need your old
          answer.
        </p>
      </div>

      {valid ? (
        <SecurityQuestionResetForm token={token!} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <p className="text-foreground font-semibold">
            This link has expired or already been used.
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Reset links are valid for 30 minutes and can be used once. Please
            request a new one from your security settings.
          </p>
          <Link
            href="/settings/security/security-question"
            className="inline-block mt-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90"
          >
            Back to security question
          </Link>
        </div>
      )}
    </div>
  );
}
