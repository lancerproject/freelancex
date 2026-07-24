import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Chat rooms | Xwork Admin" };

// Admin oversight of every client<->freelancer conversation. Read via the
// service role (bypasses the per-user RLS on conversations/messages) so Trust &
// Safety can review any chat. Read-only — the admin views, never posts.
export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const query = (q || "").trim();

  const admin = createAdminClient();
  const { data: convRows } = await admin
    .from("conversations")
    .select(
      "id, participant_1, participant_2, job_id, last_message, last_message_at, created_at"
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);
  const conversations = convRows ?? [];

  // Resolve participant names + job titles in bulk.
  const userIds = Array.from(
    new Set(
      conversations.flatMap((c) => [c.participant_1, c.participant_2]).filter(Boolean)
    )
  );
  const jobIds = Array.from(
    new Set(conversations.map((c) => c.job_id).filter(Boolean))
  );
  const nameById: Record<string, { name: string; role: string }> = {};
  if (userIds.length) {
    const { data: people } = await admin
      .from("profiles")
      .select("id, full_name, username, email, role")
      .in("id", userIds);
    for (const p of people ?? [])
      nameById[p.id] = {
        name: p.full_name || p.username || p.email || "User",
        role: p.role || "",
      };
  }
  const jobById: Record<string, string> = {};
  if (jobIds.length) {
    const { data: jobs } = await admin
      .from("jobs")
      .select("id, title")
      .in("id", jobIds);
    for (const j of jobs ?? []) jobById[j.id] = j.title || "Job";
  }

  const label = (id: string | null) =>
    id && nameById[id] ? nameById[id] : { name: "User", role: "" };

  // Optional name search (client-side filter over the fetched rows).
  const filtered = query
    ? conversations.filter((c) => {
        const a = label(c.participant_1).name.toLowerCase();
        const b = label(c.participant_2).name.toLowerCase();
        const j = (c.job_id ? jobById[c.job_id] || "" : "").toLowerCase();
        const needle = query.toLowerCase();
        return a.includes(needle) || b.includes(needle) || j.includes(needle);
      })
    : conversations;

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <Link
          href="/admin"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Trust &amp; Safety
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-3">Chat rooms</h1>
        <p className="text-muted-foreground mt-1 mb-6">
          Review any client ↔ freelancer conversation. Read-only oversight.
        </p>

        <form method="get" className="flex gap-2 mb-6 max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Filter by participant name or job…"
            className="flex-1 border border-border rounded-full px-4 py-2.5 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90">
            Filter
          </button>
        </form>

        <p className="text-sm text-muted-foreground mb-3">
          {filtered.length} conversation{filtered.length === 1 ? "" : "s"}
        </p>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="p-6 text-muted-foreground">No conversations found.</p>
          ) : (
            filtered.map((c) => {
              const p1 = label(c.participant_1);
              const p2 = label(c.participant_2);
              return (
                <Link
                  key={c.id}
                  href={`/admin/messages/${c.id}`}
                  className="block p-5 hover:bg-secondary/40"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {p1.name} ↔ {p2.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-xl">
                        {c.job_id && jobById[c.job_id]
                          ? `Job: ${jobById[c.job_id]} · `
                          : ""}
                        {c.last_message || "No messages yet"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {fmt(c.last_message_at || c.created_at)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
