import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { WizardAccountMenu } from "@/components/wizard-account-menu";
import { OverviewStep } from "@/components/overview-step";

export default async function CreateProfileOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("bio")
    .eq("id", user.id)
    .maybeSingle();
  const initialBio = (profile?.bio as string) || "";

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
        {/* progress 8/10 */}
        <div className="text-sm text-neutral-500 mb-2">8/10</div>
        <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-neutral-900 rounded-full w-[80%]" />
        </div>

        <OverviewStep initialBio={initialBio} />
      </div>
    </main>
  );
}
