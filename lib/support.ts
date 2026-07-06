// Shared helper for opening a support/request-center ticket from server code
// (support form, dispute center, etc.). Plain module — callers pass in a
// Supabase client, matching lib/notify.ts.

import { notify } from "./notify";

export type SupportAttachment = { name: string; url: string; type: string };

export type OpenTicketInput = {
  userId: string;
  subject: string;
  category: string; // account | payments | jobs | contracts | dispute | report | other
  body: string;
  contractId?: string | null;
  // Files attached to the opening message (uploaded to storage client-side).
  attachments?: SupportAttachment[];
  // Send the "we received your request" acknowledgement to the user.
  ack?: boolean;
};

// Parse the hidden "attachments" JSON field written by <AttachmentUploader>.
// Best-effort — returns [] on anything malformed so a bad field never blocks a
// ticket or reply from being saved.
export function parseAttachments(
  formData: FormData,
  field = "attachments"
): SupportAttachment[] {
  const raw = formData.get(field);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (a) => a && typeof a.url === "string" && typeof a.name === "string"
      )
      .slice(0, 10)
      .map((a) => ({
        name: String(a.name).slice(0, 200),
        url: String(a.url),
        type: typeof a.type === "string" ? a.type : "",
      }));
  } catch {
    return [];
  }
}

// Returns the new ticket id, or null on failure (callers treat as best-effort).
export async function openSupportTicket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  input: OpenTicketInput
): Promise<string | null> {
  const row: Record<string, unknown> = {
    user_id: input.userId,
    subject: input.subject.slice(0, 160),
    category: input.category,
  };
  if (input.contractId) row.contract_id = input.contractId;

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert(row)
    .select("id")
    .single();
  if (error || !ticket) return null;

  await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_id: input.userId,
    body: input.body,
    attachments:
      input.attachments && input.attachments.length
        ? input.attachments
        : null,
  });

  if (input.ack) {
    await notify(
      supabase,
      input.userId,
      "account",
      "We received your request",
      `Thanks — your request "${input.subject.slice(0, 80)}" was received. Our team typically replies within 1 business day. You can follow it in your support requests.`,
      `/support/${ticket.id}`
    );
  }

  return ticket.id as string;
}
