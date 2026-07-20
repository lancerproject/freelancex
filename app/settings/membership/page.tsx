import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { getFreelancerEarnings } from "@/lib/earnings";
import { asPlan } from "@/lib/fees";
import { MembershipPlans } from "@/components/membership-plans";

export const metadata = { title: "Membership | Xwork" };

export default async function MembershipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadOwnProfile(user.id);

  // Freelancer-only feature. Clients see a short note.
  if (profile?.role !== "freelancer") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Membership</h2>
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          The Pro membership is for freelancer accounts. It unlocks lower fees,
          job alerts, proposal insights and more.
        </div>
      </div>
    );
  }

  const membership = getMembership(profile);
  const earnings = await getFreelancerEarnings(
    supabase,
    user.id,
    asPlan(profile.plan)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Membership</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the plan that fits how you work. Upgrade or downgrade anytime.
        </p>
      </div>

      <MembershipPlans
        isPro={membership.isPro}
        status={membership.status}
        cancelled={membership.cancelled}
        endDate={membership.endDate}
        renewsOn={membership.renewsOn}
        available={earnings.available}
        hasCard={!!profile.card_last4}
        cardLabel={
          profile.card_last4
            ? `${(profile.card_brand ?? "Card").replace(/^\w/, (c: string) =>
                c.toUpperCase()
              )} •••• ${profile.card_last4}`
            : null
        }
        hasPaypal={!!profile.paypal_email}
        paypalEmail={profile.paypal_email ?? null}
      />
    </div>
  );
}
