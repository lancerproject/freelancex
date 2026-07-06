"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { openSupportTicket, parseAttachments } from "@/lib/support";

// Support requests: a user opens a ticket, adds messages, and can close or
// reopen it. Staff replies land in the same thread (is_staff = true).

export async function createSupportTicket(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subject = ((formData.get("subject") as string) || "").trim();
  const category = ((formData.get("category") as string) || "other").trim();
  const body = ((formData.get("body") as string) || "").trim();
  if (subject.length < 3 || body.length < 10) {
    redirect("/support?error=fields");
  }

  const ticketId = await openSupportTicket(supabase, {
    userId: user.id,
    subject,
    category,
    body,
    attachments: parseAttachments(formData),
    ack: true, // "we received your request" confirmation
  });
  if (!ticketId) redirect("/support?error=save");

  revalidatePath("/support");
  redirect(`/support/${ticketId}`);
}

export async function addSupportMessage(ticketId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = ((formData.get("body") as string) || "").trim();
  const attachments = parseAttachments(formData);
  // Allow a reply that is only attachments (no typed text).
  if (!body && attachments.length === 0) redirect(`/support/${ticketId}`);

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, status")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ticket) redirect("/support");

  await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    body,
    attachments: attachments.length ? attachments : null,
  });
  // A new message reopens a closed request.
  await supabase
    .from("support_tickets")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  revalidatePath(`/support/${ticketId}`);
  redirect(`/support/${ticketId}`);
}

export async function setTicketStatus(ticketId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const next = status === "closed" ? "closed" : "open";
  await supabase
    .from("support_tickets")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("user_id", user.id);

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
  redirect(`/support/${ticketId}`);
}
