"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import {
  addViolation,
  resolveViolation,
  recalcHealth,
  VIOLATION_CATALOG,
  type ViolationType,
  type Severity,
} from "@/lib/health";

// Admin: record a violation against a freelancer (by email) and recalculate
// their health score immediately.
export async function adminAddViolation(formData: FormData) {
  const { supabase, user: adminUser } = await requireAdmin();

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const type = (formData.get("type") as string) || "";
  const description = ((formData.get("description") as string) || "").trim();
  const pointsRaw = (formData.get("points") as string) || "";

  const fail = (msg: string) =>
    redirect(`/admin/violations?err=${encodeURIComponent(msg)}`);

  if (!VIOLATION_CATALOG[type as ViolationType]) {
    fail("Pick a valid violation type.");
  }
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();
  if (!target) fail("No user found with that email.");
  if (target!.role !== "freelancer") fail("That account is not a freelancer.");

  const points = pointsRaw ? Math.max(1, Math.min(100, Number(pointsRaw))) : undefined;
  const res = await addViolation({
    userId: target!.id,
    type: type as ViolationType,
    description: description || undefined,
    points: Number.isFinite(points) ? points : undefined,
    metadata: { issued_by: adminUser.id, issued_via: "admin_panel" },
  });
  if (!res.ok) fail("Could not record the violation.");
  if (res.skipped) fail("An active violation of this type already exists.");

  await notify(
    supabase,
    target!.id,
    "warning",
    "A policy violation was added to your account",
    `${VIOLATION_CATALOG[type as ViolationType].label}. Check your Account Health page for details and next steps.`,
    "/freelancer/health"
  );

  revalidatePath("/admin/violations");
  redirect("/admin/violations?ok=Violation+recorded");
}

// Admin: resolve a violation — the freelancer's score recovers immediately.
export async function adminResolveViolation(violationId: string) {
  const { supabase, user: adminUser } = await requireAdmin();
  const admin = createAdminClient();

  const { data: v } = await admin
    .from("violations")
    .select("user_id, violation_type")
    .eq("id", violationId)
    .maybeSingle();

  await resolveViolation(violationId, adminUser.id);

  if (v) {
    const cat = VIOLATION_CATALOG[v.violation_type as ViolationType];
    await notify(
      supabase,
      v.user_id,
      "account",
      "A violation on your account was resolved",
      `"${cat?.label ?? v.violation_type}" has been resolved and no longer affects your health score.`,
      "/freelancer/health"
    );
  }

  revalidatePath("/admin/violations");
}

// Admin: force a recalculation for one freelancer (testing / support).
export async function adminRecalcHealth(formData: FormData) {
  const { supabase } = await requireAdmin();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!target)
    redirect(`/admin/violations?err=${encodeURIComponent("No user found with that email.")}`);
  const result = await recalcHealth(target!.id, "admin_manual");
  if (!result)
    redirect(`/admin/violations?err=${encodeURIComponent("That account is not a freelancer.")}`);
  revalidatePath("/admin/violations");
  redirect(`/admin/violations?ok=${encodeURIComponent(`Recalculated — score is now ${result!.score}%`)}`);
}
