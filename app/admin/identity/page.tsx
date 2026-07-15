import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { approveIdentity, rejectIdentity } from "../identity-actions";

export const metadata = { title: "Identity reviews | Xwork Admin" };

// Manual review queue: identity submissions where automatic face matching
// couldn't run. Admin compares the documents, then approves or rejects.

export default async function AdminIdentityPage() {
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
  const { data: rows } = await admin
    .from("profiles")
    .select(
      "id, full_name, email, country, id_legal_name, id_type, id_dob, id_doc_front, id_doc_back, id_selfie, id_review_status"
    )
    .eq("id_review_status", "pending")
    .order("full_name");

  // The ID images live in a PRIVATE bucket now — turn each stored path into a
  // short-lived (1 hour) signed URL. Legacy submissions stored a full public
  // URL (project-files bucket); pass those through unchanged.
  const resolveImg = async (value: string | null): Promise<string | null> => {
    if (!value) return null;
    if (value.startsWith("http")) return value;
    const { data } = await admin.storage
      .from("id-verifications")
      .createSignedUrl(value, 3600);
    return data?.signedUrl ?? null;
  };
  const pending = await Promise.all(
    (rows ?? []).map(async (p) => ({
      ...p,
      frontUrl: await resolveImg(p.id_doc_front),
      backUrl: await resolveImg(p.id_doc_back),
      selfieUrl: await resolveImg(p.id_selfie),
    }))
  );

  const input =
    "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1000px] mx-auto">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← Admin
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-2">
          Identity reviews
        </h1>
        <p className="text-muted-foreground mt-1">
          Submissions where automatic face matching couldn&apos;t run. Compare
          the ID, the selfie and the account details, then approve or reject.
        </p>

        {pending.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            🎉 No identities waiting for review.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {pending.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-foreground">
                      {p.full_name || "Unnamed"}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {p.email}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Legal name on ID:{" "}
                      <span className="text-foreground font-medium">
                        {p.id_legal_name || "—"}
                      </span>{" "}
                      · {p.id_type || "ID"} · DOB {p.id_dob || "—"} ·{" "}
                      {p.country || "country unknown"}
                    </p>
                  </div>
                  <Link
                    href={`/profile/${p.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View profile →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  {(
                    [
                      ["ID — front", p.frontUrl],
                      ["ID — back", p.backUrl],
                      ["Selfie", p.selfieUrl],
                    ] as const
                  ).map(([label, url]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground mb-1">
                        {label}
                      </p>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={label}
                            className="w-full h-40 object-cover rounded-lg border border-border hover:opacity-90"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-40 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                          Missing
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-3 mt-5 flex-wrap">
                  <form action={approveIdentity.bind(null, p.id)}>
                    <button className="bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-semibold hover:opacity-90">
                      Approve — verify identity
                    </button>
                  </form>
                  <form
                    action={rejectIdentity.bind(null, p.id)}
                    className="flex items-center gap-2 flex-1 min-w-[280px]"
                  >
                    <input
                      name="note"
                      placeholder="Reason shown to the user (optional)"
                      className={input}
                    />
                    <button className="border border-destructive/50 text-destructive rounded-full px-5 py-2 text-sm font-medium hover:bg-destructive/10 shrink-0">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
