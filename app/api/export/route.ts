import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { loadOwnProfile } from "@/lib/own-profile";

// "Download my data" — everything Xwork stores about the signed-in user, as
// one JSON file. Queries run through the user's own session (RLS), so this
// can never leak anyone else's rows. Sensitive internals (OTP hashes,
// identity document numbers) are stripped.

const PROFILE_OMIT = new Set([
  "phone_otp_hash",
  "phone_otp_expires",
  "id_number",
  "identity_fingerprint",
]);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const grab = async (query: PromiseLike<{ data: unknown }>) => {
    try {
      const { data } = await query;
      return data ?? null;
    } catch {
      return null;
    }
  };

  const [
    profileRaw,
    proposals,
    contracts,
    payments,
    withdrawals,
    payoutMethods,
    reviewsWritten,
    reviewsReceived,
    savedJobs,
    supportTickets,
    notifications,
  ] = await Promise.all([
    grab(loadOwnProfile(user.id).then((p) => ({ data: p }))),
    grab(
      supabase
        .from("proposals")
        .select(
          "id, job_id, status, bid_amount, duration, payment_type, milestones, cover_letter, created_at"
        )
        .eq("freelancer_id", user.id)
    ),
    grab(
      supabase
        .from("contracts")
        .select("id, title, amount, status, start_date, end_date, created_at")
        .or(`freelancer_id.eq.${user.id},client_id.eq.${user.id}`)
    ),
    grab(
      supabase
        .from("job_payments")
        .select(
          "id, job_id, gross_amount, marketplace_fee_amount, net_amount, payment_date"
        )
        .eq("freelancer_id", user.id)
    ),
    grab(
      supabase
        .from("withdrawals")
        .select("id, method_label, amount, fee, status, created_at")
        .eq("user_id", user.id)
    ),
    grab(
      supabase
        .from("payout_methods")
        .select("id, type, label, details, is_default, created_at")
        .eq("user_id", user.id)
    ),
    grab(
      supabase
        .from("reviews")
        .select("contract_id, rating, comment, created_at")
        .eq("reviewer_id", user.id)
    ),
    grab(
      supabase
        .from("reviews")
        .select("contract_id, rating, comment, created_at")
        .eq("reviewee_id", user.id)
    ),
    grab(
      supabase.from("saved_jobs").select("job_id, created_at").eq("user_id", user.id)
    ),
    grab(
      supabase
        .from("support_tickets")
        .select("id, subject, category, status, created_at")
        .eq("user_id", user.id)
    ),
    grab(
      supabase
        .from("notifications")
        .select("type, title, message, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500)
    ),
  ]);

  // Strip internal security fields from the profile.
  let profile: Record<string, unknown> | null = null;
  if (profileRaw && typeof profileRaw === "object") {
    profile = {};
    for (const [k, v] of Object.entries(profileRaw as Record<string, unknown>)) {
      if (!PROFILE_OMIT.has(k)) profile[k] = v;
    }
  }

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile,
    proposals,
    contracts,
    payments,
    withdrawals,
    withdrawal_methods: payoutMethods,
    reviews_written: reviewsWritten,
    reviews_received: reviewsReceived,
    saved_jobs: savedJobs,
    support_tickets: supportTickets,
    recent_notifications: notifications,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="xwork-data-export.json"`,
    },
  });
}
