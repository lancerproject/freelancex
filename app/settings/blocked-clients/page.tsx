import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { unblockClient } from "@/app/invites/actions";

export const metadata = { title: "Blocked Clients | Xwork" };

// Clients whose invites this freelancer has blocked. Blocks are silent — the
// client never knows; their invites are simply never delivered.
export default async function BlockedClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: blocks } = await supabase
    .from("client_invite_blocks")
    .select("id, client_id, blocked_at, client:profiles!client_id ( full_name )")
    .eq("freelancer_id", user.id)
    .order("blocked_at", { ascending: false });
  const list = blocks ?? [];

  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Blocked clients</h2>
      <p className="text-sm text-muted-foreground">
        You won&apos;t receive job invites from clients on this list. Blocking
        is private — the client is never told. Unblock anyone at any time.
      </p>

      <div className="rounded-2xl border border-border bg-card p-6">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            You haven&apos;t blocked any clients. When you decline an invite
            you can choose to block future invites from that client — they will
            appear here.
          </p>
        ) : (
          list.map((b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client: any = Array.isArray(b.client)
              ? b.client[0]
              : b.client;
            return (
              <div
                key={b.id}
                className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-foreground font-medium">
                    {client?.full_name || "Client"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Blocked {fmt(b.blocked_at)}
                  </p>
                </div>
                <form action={unblockClient.bind(null, b.client_id)}>
                  <button className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary">
                    Unblock
                  </button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
