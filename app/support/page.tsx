import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { createSupportTicket } from "./actions";
import { AttachmentUploader } from "@/components/attachment-uploader";

export const metadata = { title: "Support requests | Xwork" };

const CATEGORIES: { value: string; label: string }[] = [
  { value: "account", label: "Account & sign in" },
  { value: "payments", label: "Payments & withdrawals" },
  { value: "jobs", label: "Jobs & proposals" },
  { value: "contracts", label: "Contracts & milestones" },
  { value: "report", label: "Report a problem" },
  { value: "other", label: "Something else" },
];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const tickets = rows ?? [];

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const catLabel = (v: string) =>
    CATEGORIES.find((c) => c.value === v)?.label ?? "Something else";
  const input =
    "w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[900px] mx-auto">
        <h1 className="text-3xl font-bold text-foreground">Support requests</h1>
        <p className="text-muted-foreground mt-1">
          Ask us anything or report a problem — we typically reply within 1
          business day. You can also browse the{" "}
          <Link href="/help" className="text-primary hover:underline">
            Help Center
          </Link>
          .
        </p>

        {sp.error && (
          <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            {sp.error === "fields"
              ? "Add a subject (3+ characters) and describe the issue (10+ characters)."
              : "Couldn't save your request. Please try again."}
          </div>
        )}

        {/* New request */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Open a new request
          </h2>
          <form action={createSupportTicket} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Subject
                </label>
                <input
                  name="subject"
                  required
                  minLength={3}
                  maxLength={120}
                  placeholder="What do you need help with?"
                  className={input}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <select name="category" className={input} defaultValue="other">
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Describe the issue
              </label>
              <textarea
                name="body"
                required
                minLength={10}
                rows={5}
                placeholder="Tell us what happened, what you expected, and any details that could help (job title, contract, dates…)"
                className={input}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Attachments (optional)
              </label>
              <div className="mt-1.5">
                <AttachmentUploader userId={user.id} />
              </div>
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90"
            >
              Submit request
            </button>
          </form>
        </div>

        {/* My requests */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Your requests
          </h2>
          {tickets.length === 0 ? (
            <p className="text-muted-foreground mt-3">
              No support requests yet. When you open one, it shows up here with
              its status and our replies.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className="flex items-center justify-between gap-4 py-4 hover:bg-secondary/40 rounded-lg px-2 -mx-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {t.subject}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {catLabel(t.category)} · opened {fmt(t.created_at)}
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
