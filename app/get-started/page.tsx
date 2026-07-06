import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { createProfile } from "@/app/dashboard/actions";
import { TestimonialCarousel } from "@/components/testimonial-carousel";

export default async function GetStartedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Make sure the profile exists (creates with the chosen role if needed).
  await createProfile();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.full_name || user.email?.split("@")[0] || "there";
  const isClient = profile?.role === "client";

  const steps = isClient
    ? [
        ["👤", "Tell us about what you need done"],
        ["📝", "Post a job and review proposals"],
        ["🛡️", "Hire and pay securely, we're here to help"],
      ]
    : [
        ["👤", "Answer a few questions and start building your profile"],
        ["📨", "Apply for open roles or list services for clients to buy"],
        ["🛡️", "Get paid safely and know we're there to help"],
      ];

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="px-8 py-5">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Hey {name}. Ready for your next big opportunity?
          </h1>

          <div className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
            {steps.map(([icon, text]) => (
              <div key={text} className="flex items-center gap-4 py-5">
                <span className="text-xl w-6 text-center">{icon}</span>
                <span className="text-neutral-800">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <Link
              href={isClient ? "/jobs/new" : "/onboarding"}
              className="bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold hover:opacity-90"
            >
              Get started
            </Link>
            <p className="text-sm text-neutral-500 max-w-xs">
              It only takes 5–10 minutes and you can edit it later. We&apos;ll
              save as you go.
            </p>
          </div>
        </div>

        {/* Right — rotating top-earner spotlights */}
        <TestimonialCarousel />
      </div>
    </main>
  );
}
