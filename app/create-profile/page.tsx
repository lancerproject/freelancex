import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { WizardAccountMenu } from "@/components/wizard-account-menu";

export default async function CreateProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // NOTE: no forward-resume redirect here. This intro is a real step in the
  // Back-button chain (onboarding ← intro ← work ← …), so jumping a returning
  // user forward from here would trap them when navigating backwards. Resume
  // is handled on login / home / dashboard instead.

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
        {/* progress */}
        <h2 className="text-xl font-semibold mb-3">Create your profile</h2>
        <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden mb-10">
          <div className="h-full bg-neutral-900 rounded-full w-[8%]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left — how to start */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              How would you like to tell us about yourself?
            </h1>
            <p className="text-neutral-600 mt-3">
              We need to get a sense of your education, experience and skills.
              You can edit everything before your profile goes live.
            </p>

            <div className="mt-8 max-w-md">
              <Link
                href="/create-profile/work"
                className="flex items-center justify-center gap-2 w-full border-2 border-primary text-primary rounded-full py-3.5 px-5 font-semibold hover:bg-primary/5 transition"
              >
                ✍️ Fill out manually (about 15 min)
              </Link>
            </div>

            <div className="mt-10">
              <Link
                href="/onboarding"
                className="inline-block px-6 py-2.5 rounded-full border border-neutral-300 font-medium hover:bg-neutral-100 transition"
              >
                Back
              </Link>
            </div>
          </div>

          {/* Right — pro tip */}
          <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-8 max-w-md">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
              X
            </div>
            <p className="text-2xl font-medium leading-snug mt-6">
              “Your Xwork profile is how you stand out from the crowd. It&apos;s
              what clients use to choose you — so let&apos;s make it a good one.”
            </p>
            <p className="text-neutral-500 mt-4">Xwork Pro Tip</p>
          </div>
        </div>
      </div>
    </main>
  );
}
