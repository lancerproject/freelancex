import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export const metadata = { title: "Support & disputes | Xwork Admin" };

// Admin view of every support request + dispute ticket, newest activity first.
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  let query = admin
    .from("support_tickets")
    .select("id, user_id, subject, category, status, contract_id, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (sp.filter === "open") query = query.eq("status", "open");
  if (sp.filter === "disputes") query = query.eq("category", "dispute");
  const { data: rows } = await query;
  const tickets = rows ?? [];

  // Resolve requester names.
  const userIds = Array.from(new Set(tickets.map((t) => t.user_id)));
  const nameById: Record<string, string> = {};
  if (userIds.length) {
    const { data: people } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const p of people ?? [])
      nameById[p.id] = p.full_name || p.email || "User";
  }

  const openCount = tickets.filter((t) => t.status === "open").length;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const tab = (key: string, label: string) => {
    const active = (sp.filter ?? "all") === key;
    const href = key === "all" ? "/admin/support" : `/admin/support?filter=${key}`;
    return (
      <Link
        href={href}
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          active
            ? "bg-primary text-primary-foreground"
            : "border border-border text-foreground hover:bg-secondary"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1000px] mx-auto">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← Admin
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-2">
          Support &amp; disputes
        </h1>
        <p className="text-muted-foreground mt-1">
          {openCount} open · {tickets.length} shown. Disputes and support
          requests both land here.
        </p>

        <div className="flex items-center gap-2 mt-5 flex-wrap">
          {tab("all", "All")}
          {tab("open", "Open")}
          {tab("disputes", "Disputes")}
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card divide-y divide-border">
          {tickets.length === 0 ? (
            <p className="p-6 text-muted-foreground">Nothing here. 🎉</p>
          ) : (
            tickets.map((t) => (
              <Link
                key={t.id}
                href={`/admin/support/${t.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-secondary/40"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {t.category === "dispute" ? "⚖️ " : ""}
                    {t.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {nameById[t.user_id] || "User"} · {t.category} · updated{" "}
                    {fmt(t.updated_at || t.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs rounded-full px-2.5 py-1 font-medium ${
                    t.status === "open"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.status === "open" ? "Open" : "Closed"}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
