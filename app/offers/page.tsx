import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { cancelOffer } from "@/app/offers/actions";

type Contract = {
  id: string;
  client_id: string;
  freelancer_id: string;
  title: string;
  amount: number;
  status: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  title: string | null;
};

export default async function OffersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Offers the current user sent (as client) and received (as freelancer).
  const { data: sentData } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, amount, status")
    .eq("client_id", user.id)
    .eq("status", "offer");

  const { data: receivedData } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, amount, status")
    .eq("freelancer_id", user.id)
    .eq("status", "offer");

  const sent = (sentData as Contract[] | null) ?? [];
  const received = (receivedData as Contract[] | null) ?? [];

  // Contracts have both client_id and freelancer_id pointing at profiles, so
  // embedded joins are ambiguous. Fetch the needed profiles separately and map.
  const profileIds = Array.from(
    new Set([
      ...sent.map((c) => c.freelancer_id),
      ...received.map((c) => c.client_id),
    ])
  );

  const profileMap = new Map<string, Profile>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, title")
      .in("id", profileIds);

    for (const p of (profiles as Profile[] | null) ?? []) {
      profileMap.set(p.id, p);
    }
  }

  const nameOf = (id: string) => {
    const p = profileMap.get(id);
    return p?.full_name || p?.username || "Unknown";
  };

  return (
    <main className="min-h-screen px-4 lg:px-8 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">Pending offers</h1>

      <section>
        <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
          Offers you sent
        </h2>
        {sent.length === 0 ? (
          <p className="text-muted-foreground">No pending offers.</p>
        ) : (
          <div className="space-y-4">
            {sent.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <p className="text-foreground font-medium">
                  {nameOf(c.freelancer_id)}
                </p>
                <p className="text-foreground">{c.title}</p>
                <p className="text-muted-foreground">${c.amount}</p>
                <form action={cancelOffer.bind(null, c.id)} className="mt-3">
                  <button className="border border-border text-foreground rounded-full px-4 py-2 text-sm hover:bg-secondary">
                    Cancel
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
          Offers you received
        </h2>
        {received.length === 0 ? (
          <p className="text-muted-foreground">No pending offers.</p>
        ) : (
          <div className="space-y-4">
            {received.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <p className="text-foreground font-medium">
                  {nameOf(c.client_id)}
                </p>
                <p className="text-foreground">{c.title}</p>
                <p className="text-muted-foreground">${c.amount}</p>
                <div className="mt-3">
                  <Link
                    href={`/freelancer/offers/${c.id}`}
                    className="inline-block bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:opacity-90"
                  >
                    👁 View Offer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
