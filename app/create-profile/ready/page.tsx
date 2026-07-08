import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { WizardAccountMenu } from "@/components/wizard-account-menu";

export const dynamic = "force-dynamic";

export default async function ProfileReadyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const first = (profile?.full_name as string)?.split(" ")[0] || "there";

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="flex items-center justify-between px-8 py-4 border-b border-neutral-200">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>
        <WizardAccountMenu full />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* Congrats hero */}
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h1 className="text-4xl font-bold tracking-tight">
            Congratulations, {first}!
          </h1>
          <p className="text-2xl font-semibold mt-2">Your profile is ready.</p>
          <p className="text-neutral-600 mt-3 max-w-xl mx-auto">
            You&apos;re all set to start finding work on Xwork. The best part?
            You can start applying right now — for free.
          </p>
        </div>

        {/* Free to apply — the hero offer */}
        <div className="mt-10 rounded-3xl p-[2px] bg-gradient-to-r from-primary via-fuchsia-400 to-purple-500">
          <div className="rounded-3xl bg-white p-8 text-center">
            <span className="inline-block text-xs font-bold tracking-wide text-primary bg-primary/10 rounded-full px-3 py-1">
              NO CONNECTS NEEDED
            </span>
            <h2 className="text-3xl font-bold mt-4">
              Apply to jobs — <span className="text-primary">100% free</span>
            </h2>
            <p className="text-neutral-600 mt-3 max-w-lg mx-auto">
              On Xwork you don&apos;t buy tokens to bid. Browse jobs, send
              proposals, and win work without paying a thing. Bidding is free —
              forever.
            </p>
            <Link
              href="/dashboard?published=1"
              className="inline-block mt-6 bg-primary text-primary-foreground text-lg font-semibold rounded-full px-10 py-4 hover:opacity-90 transition shadow-sm"
            >
              🚀 Start free
            </Link>
            <p className="text-xs text-neutral-400 mt-3">
              No card required. Start bidding immediately.
            </p>
          </div>
        </div>

        {/* Xwork Pro — live membership offer */}
        <div className="mt-8 rounded-2xl bg-neutral-900 text-white p-7 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-xs font-bold tracking-wide bg-primary/25 rounded-full px-3 py-1">
            $20/MONTH
          </div>
          <p className="text-sm font-semibold text-neutral-300 tracking-wide">
            XWORK PLUS
          </p>
          <h3 className="text-2xl font-bold mt-1">Go Pro</h3>
          <p className="text-neutral-300 mt-2 max-w-lg">
            Keep more of what you earn and get seen first. Pro lowers your
            service fee from 10% to 5% and unlocks tools to help you win more
            work. Cancel anytime.
          </p>
          <ul className="mt-4 space-y-1.5 text-neutral-300 text-sm">
            <li>✦ Lower 5% service fee (instead of 10%)</li>
            <li>✦ Priority placement in client searches</li>
            <li>✦ Real-time, customizable job alerts</li>
            <li>✦ Profile insights &amp; analytics, plus a Pro badge</li>
          </ul>
          <Link
            href="/settings/membership"
            className="inline-block mt-6 bg-white text-neutral-900 font-semibold rounded-full px-7 py-3 hover:opacity-90 transition"
          >
            Upgrade to Pro →
          </Link>
        </div>

        <div className="text-center mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <Link
            href="/dashboard?published=1"
            className="text-neutral-600 hover:text-primary font-medium"
          >
            Browse the job feed →
          </Link>
          <Link
            href="/profile"
            className="text-neutral-600 hover:text-primary font-medium"
          >
            View my profile →
          </Link>
        </div>
      </div>
    </main>
  );
}
