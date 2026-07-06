import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { WizardAccountMenu } from "@/components/wizard-account-menu";
import { LanguagesStep } from "@/components/languages-step";

export default async function CreateProfileLanguagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("languages")
    .eq("id", user.id)
    .maybeSingle();
  let initialEnglishLevel = "";
  const initialExtra: { language: string; proficiency: string }[] = [];
  try {
    const parsed = JSON.parse(String(profile?.languages || "[]"));
    if (Array.isArray(parsed)) {
      for (const l of parsed) {
        if (l?.language === "English") {
          initialEnglishLevel = l.proficiency || "";
        } else if (l?.language) {
          initialExtra.push({
            language: l.language,
            proficiency: l.proficiency || "",
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="flex items-center justify-between px-8 py-4 border-b border-neutral-200">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>
        <WizardAccountMenu />
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {/* progress 7/10 */}
        <div className="text-sm text-neutral-500 mb-2">7/10</div>
        <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-neutral-900 rounded-full w-[70%]" />
        </div>

        <LanguagesStep
          initialEnglishLevel={initialEnglishLevel}
          initialExtra={initialExtra}
        />
      </div>
    </main>
  );
}
