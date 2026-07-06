import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { WizardAccountMenu } from "@/components/wizard-account-menu";
import { SkillsStep } from "@/components/skills-step";
import { SUGGESTED_SKILLS_BY_CATEGORY } from "@/lib/work-categories";

export default async function CreateProfileSkillsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Suggested skills come from the category picked on the previous step.
  const { data: profile } = await supabase
    .from("profiles")
    .select("categories, skills")
    .eq("id", user.id)
    .maybeSingle();

  const category = (profile?.categories as string) || "";
  const suggested =
    SUGGESTED_SKILLS_BY_CATEGORY[category] ||
    SUGGESTED_SKILLS_BY_CATEGORY["Web, Mobile & Software Dev"];
  const initialSkills = String(profile?.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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
        {/* progress 3/10 */}
        <div className="text-sm text-neutral-500 mb-2">3/10</div>
        <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-neutral-900 rounded-full w-[30%]" />
        </div>

        <SkillsStep suggested={suggested} initialSkills={initialSkills} />
      </div>
    </main>
  );
}
