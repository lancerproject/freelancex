"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { COUNTRIES } from "@/lib/countries";
import { getFreelancerEarnings } from "@/lib/earnings";
import { getMembership } from "@/lib/membership";
import { taxInfoComplete } from "@/lib/tax";

// We deliberately store ONLY masked, display-only identifiers (a derived card
// reference, an email with the local part masked, the last 4 digits of an
// account) — never a full bank/card number or any credential.

type MethodResult = { ok: boolean; error?: string };

// Payouts require a verified identity (KYC) and a non-suspended account.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function payoutGuard(): Promise<
  { ok: true; supabase: any; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("id_verified, suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.suspended) {
    return { ok: false, error: "Your account is suspended, so withdrawal methods can't be changed." };
  }
  if (!me?.id_verified) {
    return { ok: false, error: "Verify your identity before adding a withdrawal method." };
  }
  return { ok: true, supabase, userId: user.id };
}

// New methods activate after a 3-day security period.
function activationDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString();
}

// Deterministic 8-char reference for display (e.g. "Payoneer Payment Card -
// e3aa5787") — derived from the account email, never stored in full.
function displayRef(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  type: string,
  label: string,
  details: string
): Promise<MethodResult> {
  // First method becomes the preferred one.
  const { count } = await supabase
    .from("payout_methods")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { error } = await supabase.from("payout_methods").insert({
    user_id: userId,
    type,
    label,
    details,
    is_default: (count ?? 0) === 0,
    active_at: activationDate(),
  });
  if (error) return { ok: false, error: "Couldn't save the method. Please try again." };

  await notify(
    supabase,
    userId,
    "account",
    "Withdrawal method added",
    `${label} was added to your account. It may take up to 3 days to activate. If this wasn't you, remove it and change your password.`,
    "/withdraw"
  );
  revalidatePath("/withdraw");
  return { ok: true };
}

// Connect a Payoneer account (after the freelancer confirms their Payoneer
// email in the connect flow). We store only a derived display reference and
// the masked email.
export async function connectPayoneer(email: string): Promise<MethodResult> {
  const guard = await payoutGuard();
  if (!guard.ok) return guard;

  const clean = (email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
    return { ok: false, error: "Enter the email address of your Payoneer account." };
  }

  // One Payoneer method at a time.
  const { data: existing } = await guard.supabase
    .from("payout_methods")
    .select("id")
    .eq("user_id", guard.userId)
    .eq("type", "payoneer")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "You already have a Payoneer method. Remove it first to connect a different account." };
  }

  const [name, domain] = clean.split("@");
  const maskedEmail = `${name[0]}•••@${domain}`;
  const label = `Payoneer Payment Card - ${displayRef(clean)}`;
  return insertMethod(guard.supabase, guard.userId, "payoneer", label, maskedEmail);
}

// SWIFT/BIC per ISO 9362: 4-letter bank code + 2-letter country + 2-char
// location + optional 3-char branch.
function validSwift(v: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
}

// IBAN per ISO 13616: country + 2 check digits + BBAN, verified with the
// standard mod-97 checksum.
function validIban(v: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  const rearranged = v.slice(4) + v.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const piece = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of piece) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

// Direct to Local Bank — available for every country. Follows international
// transfer rules: full holder name, bank name + country, SWIFT/BIC code and
// the account number or IBAN. Only the last 4 characters are ever stored.
export async function addBankMethod(params: {
  holder: string;
  bankName: string;
  country: string;
  swift: string;
  accountNumber: string;
}): Promise<MethodResult> {
  const guard = await payoutGuard();
  if (!guard.ok) return guard;

  const holder = (params.holder || "").trim();
  const bankName = (params.bankName || "").trim();
  const country = (params.country || "").trim();
  const swift = (params.swift || "").replace(/\s+/g, "").toUpperCase();
  const account = (params.accountNumber || "").replace(/\s+/g, "").toUpperCase();

  if (holder.length < 4 || !/^[\p{L}][\p{L} .'-]+$/u.test(holder)) {
    return { ok: false, error: "Enter the account holder's full name, exactly as the bank has it." };
  }
  if (bankName.length < 2) {
    return { ok: false, error: "Enter your bank's name." };
  }
  if (!(COUNTRIES as readonly string[]).includes(country)) {
    return { ok: false, error: "Select the country of your bank." };
  }
  if (!validSwift(swift)) {
    return { ok: false, error: "That SWIFT/BIC code isn't valid — it's 8 or 11 characters, like HABBPKKA." };
  }
  const looksIban = /^[A-Z]{2}\d{2}/.test(account);
  if (looksIban ? !validIban(account) : !/^[A-Z0-9]{6,34}$/.test(account)) {
    return {
      ok: false,
      error: looksIban
        ? "That IBAN doesn't pass the checksum — double-check it with your bank."
        : "Enter a valid account number or IBAN (6–34 letters and digits).",
    };
  }

  const label = `Local Bank (${country}) •••• ${account.slice(-4)}`;
  const details = `${holder} · ${bankName} · SWIFT ${swift}`;
  return insertMethod(guard.supabase, guard.userId, "local_bank", label, details);
}

// Remove a method — the UI requires the account password first (usePasswordGate).
export async function removePayoutMethod(id: string): Promise<MethodResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: method } = await supabase
    .from("payout_methods")
    .select("id, label, is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!method) return { ok: false, error: "Method not found." };

  await supabase
    .from("payout_methods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  // If the preferred method was removed, promote the oldest remaining one.
  if (method.is_default) {
    const { data: next } = await supabase
      .from("payout_methods")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase
        .from("payout_methods")
        .update({ is_default: true })
        .eq("id", next.id);
    }
  }

  await notify(
    supabase,
    user.id,
    "account",
    "Withdrawal method removed",
    `${method.label} was removed from your account. If this wasn't you, change your password immediately.`,
    "/withdraw"
  );
  revalidatePath("/withdraw");
  return { ok: true };
}

// Withdrawal provider fee, by method type.
function withdrawalFee(methodType: string): number {
  return methodType === "payoneer" ? 2 : 0.99;
}

// Withdraw the available balance (or part of it) to a saved method. The UI
// asks for the account password first (usePasswordGate). Records a row in the
// withdrawals ledger, which lib/earnings subtracts from the available balance.
export async function requestWithdrawal(
  methodId: string,
  amount: number
): Promise<MethodResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select(
      "id_verified, suspended, tax_info, plan, membership_status, membership_end_date, membership_autorenew"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (me?.suspended) {
    return { ok: false, error: "Your account is suspended, so funds can't be withdrawn." };
  }
  if (!me?.id_verified) {
    return { ok: false, error: "Verify your identity before withdrawing." };
  }
  if (!taxInfoComplete(me?.tax_info)) {
    return { ok: false, error: "Complete your tax information before withdrawing." };
  }

  const { data: method } = await supabase
    .from("payout_methods")
    .select("id, type, label, active_at")
    .eq("id", methodId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!method) return { ok: false, error: "Choose a withdrawal method." };
  if (method.active_at && new Date(method.active_at).getTime() > Date.now()) {
    return {
      ok: false,
      error: "That method is still in its 3-day security period. Pick another method or try again later.",
    };
  }

  const amt = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  const fee = withdrawalFee(method.type);
  if (!Number.isFinite(amt) || amt < 5) {
    return { ok: false, error: "The minimum withdrawal is $5.00." };
  }

  const earnings = await getFreelancerEarnings(
    supabase,
    user.id,
    getMembership(me).plan
  );
  if (amt > earnings.available) {
    return { ok: false, error: "That's more than your available balance." };
  }

  // Insert through the service-role client so the user-facing INSERT policy on
  // `withdrawals` can be removed — that policy let anyone POST an arbitrary
  // amount straight to PostgREST, bypassing every balance/verification check
  // above. Now the ONLY way to create a withdrawal is through this guarded path.
  const admin = createAdminClient();
  const { error } = await admin.from("withdrawals").insert({
    user_id: user.id,
    method_id: method.id,
    method_label: method.label,
    amount: amt,
    fee,
    status: "completed",
  });
  if (error) {
    return { ok: false, error: "Couldn't process the withdrawal. Please try again." };
  }

  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  await notify(
    supabase,
    user.id,
    "payments",
    "Withdrawal processed",
    `${money(amt)} was sent to ${method.label} (${money(fee)} provider fee — you'll receive ${money(amt - fee)}). If this wasn't you, contact support immediately.`,
    "/withdraw"
  );
  revalidatePath("/withdraw");
  revalidatePath("/transactions");
  revalidatePath("/finances");
  return { ok: true };
}

// Mark a method as the preferred payout destination.
export async function makeDefaultPayoutMethod(id: string): Promise<MethodResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  await supabase
    .from("payout_methods")
    .update({ is_default: false })
    .eq("user_id", user.id);
  await supabase
    .from("payout_methods")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/withdraw");
  return { ok: true };
}
