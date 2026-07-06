"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { parseAttachments } from "@/lib/support";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Admin replies to support tickets. Uses the service-role client so staff can
// act on any user's ticket (RLS scopes normal clients to their own rows).

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_admin) redirect("/dashboard");
  return { supabase, adminId: user.id };
}

export async function adminReplyTicket(ticketId: string, formData: FormData) {
  const { adminId } = await ensureAdmin();
  const body = ((formData.get("body") as string) || "").trim();
  const attachments = parseAttachments(formData);
  if (!body && attachments.length === 0) redirect(`/admin/support/${ticketId}`);

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, user_id, subject")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) redirect("/admin/support");

  await admin.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: adminId,
    is_staff: true,
    body,
    attachments: attachments.length ? attachments : null,
  });
  await admin
    .from("support_tickets")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  // Let the user know support replied.
  await notify(
    admin,
    ticket.user_id,
    "account",
    "Xwork Support replied",
    `Support replied to your request "${ticket.subject}". Open it to read and respond.`,
    `/support/${ticketId}`
  );

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  redirect(`/admin/support/${ticketId}`);
}

export async function adminSetTicketStatus(ticketId: string, status: string) {
  await ensureAdmin();
  const next = status === "closed" ? "closed" : "open";
  const admin = createAdminClient();
  await admin
    .from("support_tickets")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  redirect(`/admin/support/${ticketId}`);
}
