import { createClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";
import { localHelpAnswer } from "@/lib/help-bot";

// AI help assistant for the Help Center. Answers questions about how Xwork
// works and, when the user wants a human or to report a problem, drafts a
// support ticket for them to review and submit (the client renders the draft
// as an editable form). Calls the Anthropic API directly over HTTPS so no SDK
// dependency is needed; the key lives in ANTHROPIC_API_KEY (never hardcoded).

const MODEL = process.env.HELP_AI_MODEL || "claude-opus-4-8";

const SYSTEM_PROMPT = `You are Casio, the friendly human-sounding helper in Xwork's Help Center. Xwork is a freelance marketplace (freelancer side).

How you talk:
- Talk like a real, warm person — not a robot or a corporate FAQ. Use natural, everyday language, contractions ("you'll", "it's", "don't"), and a calm, encouraging tone.
- Introduce yourself as Casio if it fits naturally, but don't repeat your name in every message.
- Keep it short and human: 1-3 short paragraphs or a small list. Get to the point kindly.
- It's fine to show a little personality and reassurance ("Good news —", "No worries,", "Happy to help with that"). A single, tasteful emoji now and then is okay; don't overdo it.
- Never sound scripted, never dump a wall of text, and never invent features that don't exist.

What you know about Xwork:

What you know about Xwork:
- Applying to jobs is FREE — there are no "connects" or credits. Each job accepts the first 50 proposals.
- Contracts are fixed-price with milestones. The client funds a milestone into escrow before work starts; when they approve the work, the money (minus the fee) is released to the freelancer's balance.
- Service fee for freelancers: 10% on the free Basic plan, or 5% with Pro membership ($20/month), shown clearly in earnings.
- Withdrawals: add a withdrawal method (Local Bank in any country, or Payoneer). You must verify your identity and complete tax info before withdrawing. New methods activate after a 3-day security period. Withdraw from the Withdrawals page.
- Identity verification (Settings → Identity) is a one-time check with a document + selfie. If automatic face matching can't run, a person reviews it (usually within 24 hours).
- Phone verification is in Settings → Contact info.
- Refunds & disputes: on a contract you can request a refund; if a contract is ended while money is in escrow the escrow is returned, and either side can open a dispute.
- Reviews, Job Success Score, and talent badges (Rising Talent, Top Rated, Top Rated Plus) come from real completed contracts.
- Keep all communication and payments on Xwork — sharing contact details or arranging off-platform payment is blocked and can suspend the account.
- You can download all your data from Settings → Contact info.

This is the FREELANCER assistant. Never mention, explain, or volunteer anything about the client side of Xwork — client fees, what clients pay, client features, or what clients are required to do. Only ever talk about the freelancer's own fee (10% Basic / 5% Pro). If the user asks about client-side fees or requirements, do NOT give specifics or numbers: reply very briefly that it's separate from their freelancer account and you can't go into it, then steer back to their side. Keep such replies short and vague.

If the user wants to talk to a human, report a problem, or has an issue you can't resolve with the above, call the open_support_ticket tool with a clear subject, the best-fitting category, and a description written in the user's voice. Briefly tell them you've prepared a ticket for them to review. Do not promise specific outcomes or timelines beyond "our team typically replies within 1 business day."`;

const TICKET_TOOL = {
  name: "open_support_ticket",
  description:
    "Open a support ticket for the user. Call this when the user wants to contact human support, open a ticket, report a problem or bug, or when their issue can't be resolved with self-service help. Summarize their issue into a draft the user will review and submit.",
  input_schema: {
    type: "object",
    properties: {
      subject: {
        type: "string",
        description: "A short subject line for the ticket, under 100 characters.",
      },
      category: {
        type: "string",
        enum: ["account", "payments", "jobs", "contracts", "report", "other"],
        description: "The category that best fits the issue.",
      },
      description: {
        type: "string",
        description:
          "A clear description of the issue in the user's own voice, with any useful detail.",
      },
    },
    required: ["subject", "category", "description"],
  },
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-20) // keep the last 20 turns
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send a message first." }, { status: 400 });
  }

  const lastUserMessage = history[history.length - 1].content;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No AI key configured — answer from Xwork's built-in knowledge base so
    // the assistant is genuinely useful out of the box, and offer a ticket
    // when it can't help.
    return NextResponse.json(localHelpAnswer(lastUserMessage));
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [TICKET_TOOL],
        messages: history,
      }),
    });

    if (!res.ok) {
      // AI unreachable (bad key, rate limit, outage) — fall back to the
      // built-in answerer so the user still gets help.
      return NextResponse.json(localHelpAnswer(lastUserMessage));
    }

    const data = await res.json();
    const blocks: Array<Record<string, unknown>> = data.content ?? [];

    const text = blocks
      .filter((b) => b.type === "text")
      .map((b) => String(b.text || ""))
      .join("\n")
      .trim();

    const toolUse = blocks.find(
      (b) => b.type === "tool_use" && b.name === "open_support_ticket"
    );

    if (toolUse) {
      const input = (toolUse.input as Record<string, string>) || {};
      return NextResponse.json({
        reply:
          text ||
          "I've prepared a support ticket for you — review the details below and submit it, or edit anything first.",
        ticketDraft: {
          subject: (input.subject || "").slice(0, 120),
          category: input.category || "other",
          description: input.description || "",
        },
      });
    }

    return NextResponse.json({
      reply: text || "I'm not sure how to help with that — want me to open a support ticket?",
    });
  } catch {
    return NextResponse.json(localHelpAnswer(lastUserMessage));
  }
}
