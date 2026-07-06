import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ContactAccountCard } from "@/components/contact-account-card";
import { ContactLocationCard } from "@/components/contact-location-card";

export const metadata = { title: "Contact info | Xwork" };

export default async function ContactInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; email_pending?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let sp: { saved?: string; email_pending?: string; error?: string } = {};
  try {
    sp = (await searchParams) || {};
  } catch {
    /* ignore */
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Contact info</h2>

      {sp.saved === "1" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 text-primary px-4 py-2.5 text-sm">
          ✓ Your account details were updated.
        </div>
      )}
      {sp.error === "save" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2.5 text-sm">
          We couldn&apos;t save your changes. Please try again.
        </div>
      )}
      {sp.error === "email" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2.5 text-sm">
          We couldn&apos;t update your email — it may already be in use. Your
          other details were saved; please try a different email address.
        </div>
      )}
      {sp.email_pending === "1" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-foreground">
          We sent a verification link to your new email. Confirm it, then sign
          in with your new email and the same password — your email will change
          once confirmed.
        </div>
      )}

      <ContactAccountCard
        userId={user.id.slice(0, 8)}
        fullName={profile?.full_name || profile?.username || ""}
        email={user.email || ""}
      />

      <ContactLocationCard
        timezone={profile?.timezone || ""}
        country={profile?.country || ""}
        address1={profile?.address1 || ""}
        address2={profile?.address2 || ""}
        city={profile?.city || ""}
        state={profile?.state || ""}
        postalCode={profile?.postal_code || ""}
        phone={profile?.phone || ""}
        phoneVerified={!!profile?.phone_verified_at}
      />

      {/* Data export */}
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <h3 className="text-xl font-bold text-foreground">Your data</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Download a copy of everything Xwork stores about you — your profile,
          proposals, contracts, payments, withdrawals, reviews and recent
          notifications — as a single JSON file.
        </p>
        <a
          href="/api/export"
          className="inline-block mt-4 border border-border text-foreground rounded-full px-5 py-2 text-sm font-medium hover:bg-secondary"
        >
          ⬇ Download my data
        </a>
      </div>

      <p className="text-sm text-muted-foreground">
        Your contact details are private and only shared with people you work
        with on Xwork.
      </p>
    </div>
  );
}
