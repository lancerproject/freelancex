"use server";

import { createClient } from "@/lib/supabase-server";
import { openSupportTicket } from "@/lib/support";
import { revalidatePath } from "next/cache";

// Creates a support ticket from the AI help chat's reviewed draft. Returns the
// new ticket id so the chat can link the user straight to it.
export async function submitChatTicket(input: {
  subject: string;
  category: string;
  description: string;
}): Promise<{ ok: boolean; ticketId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const subject = (input.subject || "").trim();
  const description = (input.description || "").trim();
  const allowed = ["account", "payments", "jobs", "contracts", "report", "other"];
  const category = allowed.includes(input.category) ? input.category : "other";

  if (subject.length < 3 || description.length < 10) {
    return {
      ok: false,
      error: "Add a subject and a bit more detail before submitting.",
    };
  }

  const ticketId = await openSupportTicket(supabase, {
    userId: user.id,
    subject,
    category,
    body: description,
    ack: true,
  });
  if (!ticketId) return { ok: false, error: "Couldn't create the ticket. Please try again." };

  revalidatePath("/support");
  return { ok: true, ticketId };
}
