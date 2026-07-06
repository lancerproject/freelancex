import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { closeAccount } from "./actions";
import { getFreelancerEarnings } from "@/lib/earnings";
import { getMembership } from "@/lib/membership";

export const metadata = { title: "Close account | Xwork" };

export default async function CloseAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let sp: { error?: string } = {};
  try {
    sp = (await searchParams) || {};
  } catch {
    /* ignore */
  }

  const { count: pendingProposals } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .eq("freelancer_id", user.id)
    .eq("status", "pending");

  const { count: activeContracts } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .or(`freelancer_id.eq.${user.id},client_id.eq.${user.id}`)
    .in("status", ["active", "disputed"]);

  const { data: prof } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const earnings = await getFreelancerEarnings(
    supabase,
    user.id,
    getMembership(prof).plan
  );
  const available = earnings.available;
  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  const pp = pendingProposals ?? 0;
  const ac = activeContracts ?? 0;
  const blocked = pp > 0 || ac > 0 || available > 0;

  const checkItem = (done: boolean, text: React.ReactNode) => (
    <li className="flex items-start gap-2">
      <span className={done ? "text-primary" : "text-red-500"}>
        {done ? "✓" : "✕"}
      </span>
      <span className="text-foreground">{text}</span>
    </li>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link
          href="/settings/contact"
          className="text-sm text-primary hover:underline"
        >
          ← Back to contact info
        </Link>
        <h2 className="text-2xl font-bold text-foreground mt-3">
          Close my account
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Closing your account deactivates it and signs you out. Before you can
          close it, you need to wrap up any open work.
        </p>
      </div>

      {sp.error === "password" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2.5 text-sm">
          That password is incorrect. Please try again.
        </div>
      )}
      {sp.error === "conditions" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2.5 text-sm">
          You still have open proposals or contracts. Please resolve them first.
        </div>
      )}
      {sp.error === "balance" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2.5 text-sm">
          You still have an available balance. Please withdraw it before
          closing your account.
        </div>
      )}

      {/* Requirements */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold text-foreground mb-3">
          Before closing your account
        </h3>
        <ul className="space-y-3 text-sm">
          {checkItem(
            pp === 0,
            pp === 0 ? (
              "No pending proposals."
            ) : (
              <>
                You have {pp} pending proposal{pp === 1 ? "" : "s"}.{" "}
                <Link href="/freelancer" className="text-primary hover:underline">
                  Withdraw them
                </Link>{" "}
                first.
              </>
            )
          )}
          {checkItem(
            ac === 0,
            ac === 0 ? (
              "No active contracts."
            ) : (
              <>
                You have {ac} active contract{ac === 1 ? "" : "s"}.{" "}
                <Link href="/contracts" className="text-primary hover:underline">
                  End them
                </Link>{" "}
                first.
              </>
            )
          )}
          {checkItem(
            available <= 0,
            available <= 0 ? (
              "No balance left to withdraw."
            ) : (
              <>
                You have {money(available)} available.{" "}
                <Link href="/withdraw" className="text-primary hover:underline">
                  Withdraw it
                </Link>{" "}
                first.
              </>
            )
          )}
        </ul>
      </div>

      {/* Confirm with password */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold text-foreground">Confirm closure</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          {blocked
            ? "Resolve the items above to enable account closure."
            : "Enter your password to permanently close your account."}
        </p>
        <form action={closeAccount} className="space-y-4">
          <input
            type="password"
            name="password"
            required
            disabled={blocked}
            placeholder="Your password"
            className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={blocked}
            className="bg-red-500 text-white px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Close my account
          </button>
        </form>
      </div>
    </div>
  );
}
