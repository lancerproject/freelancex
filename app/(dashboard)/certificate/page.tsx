import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { getFreelancerEarnings } from "@/lib/earnings";

export default async function CertificatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, created_at, plan, membership_status, membership_end_date, membership_autorenew"
    )
    .eq("id", user.id)
    .maybeSingle();
  const membership = getMembership(profile);

  const earnings = await getFreelancerEarnings(supabase, user.id, membership.plan);
  const released = earnings.breakdown;
  const gross = earnings.lifetime;
  const net = earnings.lifetimeNet;

  const dates = released
    .map((b) => new Date(b.date || Date.now()).getTime())
    .sort((a, b) => a - b);
  const periodFrom = dates.length
    ? new Date(dates[0]).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—";
  const periodTo = dates.length
    ? new Date(dates[dates.length - 1]).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—";

  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="flex items-center justify-between max-w-3xl mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Certificate of earnings
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 lg:p-12 max-w-3xl">
        <div className="text-center border-b border-border pb-6">
          <p className="text-2xl font-bold">
            <span className="text-primary">X</span>
            <span className="text-foreground">work</span>
          </p>
          <p className="text-muted-foreground mt-2">Certificate of Earnings</p>
        </div>

        <div className="mt-8 space-y-4 text-sm">
          <Row label="Freelancer" value={profile?.full_name || "Member"} />
          <Row label="Period" value={`${periodFrom} – ${periodTo}`} />
          <Row label="Payments received" value={String(released.length)} />
          <Row label="Gross earnings" value={money(gross)} />
          <Row label="Marketplace fee" value={`− ${money(gross - net)}`} />
          <div className="border-t border-border pt-4 flex justify-between">
            <span className="font-semibold text-foreground">Net earnings</span>
            <span className="font-bold text-foreground text-lg">
              {money(net)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          This certificate summarizes earnings recorded on Xwork for the period
          shown.
        </p>
      </div>

      <p className="text-sm text-muted-foreground mt-4 max-w-3xl">
        Tip: use your browser&apos;s Print option to save this as a PDF.
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
