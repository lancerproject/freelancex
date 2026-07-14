"use server";

import { createClient } from "@/lib/supabase-server";
import { notify } from "@/lib/notify";
import { recalcHealth } from "@/lib/health";
import { redirect } from "next/navigation";

export async function submitReview(
  contractId: string,
  revieweeId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rating = Number(formData.get("rating"));
  const comment = (formData.get("comment") as string) || null;

  if (!rating || rating < 1 || rating > 5) {
    redirect(`/contracts/${contractId}`);
  }

  // Private feedback (never shown publicly — feeds quality signals only).
  const privateRatingRaw = Number(formData.get("private_rating"));
  const privateRating =
    privateRatingRaw >= 1 && privateRatingRaw <= 5 ? privateRatingRaw : null;
  const privateComment =
    ((formData.get("private_comment") as string) || "").trim() || null;

  const { error } = await supabase.from("reviews").upsert(
    {
      contract_id: contractId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment,
      private_rating: privateRating,
      private_comment: privateComment,
    },
    { onConflict: "contract_id,reviewer_id" }
  );

  if (error) {
    console.error("REVIEW ERROR:", error);
  } else {
    const { data: me } = await supabase
      .from("profiles")
      .select("full_name, username, email")
      .eq("id", user.id)
      .maybeSingle();
    const who = me?.full_name || me?.username || me?.email || "Someone";
    await notify(
      supabase,
      revieweeId,
      "review",
      "You received a review",
      `${who} left you a ${rating}-star review.`,
      `/contracts/${contractId}?tab=details`
    );
    // Account health: reviews affect the score — recalc immediately (no-ops
    // for non-freelancers).
    try {
      await recalcHealth(revieweeId, `review:${rating}star`);
    } catch {
      /* best-effort */
    }
  }

  redirect(`/contracts/${contractId}`);
}
