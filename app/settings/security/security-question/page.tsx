import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { SecurityQuestionForm } from "@/components/security-question-form";

export const metadata = { title: "Security question | Xwork" };

export default async function SecurityQuestionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("security_question")
    .eq("id", user.id)
    .maybeSingle();

  const current = profile?.security_question || "";

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Security question and answer
        </h2>
        <p className="text-muted-foreground mt-1">
          Choose a question only you can answer. We&apos;ll ask for it when you
          can&apos;t use your usual two-step verification method to sign in.
        </p>
      </div>

      <SecurityQuestionForm current={current} />
    </div>
  );
}
