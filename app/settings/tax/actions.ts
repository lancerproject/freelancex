"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/notify";
import { loadOwnProfile } from "@/lib/own-profile";

/* ------------------------------------------------------------------ */
/* Sectioned tax form (Tax residence / Taxpayer identification / TIN)  */
/* ------------------------------------------------------------------ */

// Reads the existing tax_info JSON, merges a patch, and writes it back.
async function mergeTaxInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: Record<string, any>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const profile = await loadOwnProfile(user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let info: Record<string, any> = {};
  try {
    if (profile?.tax_info) info = JSON.parse(profile.tax_info);
  } catch {
    /* start fresh */
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const next: Record<string, any> = {
    ...info,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  // Mark fully submitted once all three sections are present (gates withdrawal).
  const residenceDone = !!(next.res_country && next.res_address1 && next.res_city);
  const idDone = !!(
    next.legal_name &&
    next.fed_tax_classification &&
    (next.us_person || next.country_citizenship)
  );
  const tinDone = !!(next.tin && next.certified && next.signature);
  next.submitted = residenceDone && idDone && tinDone;

  const { error } = await supabase
    .from("profiles")
    .update({ tax_info: JSON.stringify(next) })
    .eq("id", user.id);
  if (error) {
    return { ok: false, error: "Couldn't save. Please try again." };
  }
  revalidatePath("/settings/tax");
  return { ok: true };
}

export async function saveTaxResidence(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const g = (k: string) => String(formData.get(k) || "").trim();
  const res_country = g("res_country");
  const res_address1 = g("res_address1");
  const res_city = g("res_city");
  const res_postal = g("res_postal");
  if (!res_country || !res_address1 || !res_city) {
    return { ok: false, error: "Please fill in country, address and city." };
  }
  return mergeTaxInfo({
    res_country,
    res_address1,
    res_address2: g("res_address2"),
    res_city,
    res_postal,
  });
}

export async function saveTaxIdentification(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const g = (k: string) => String(formData.get(k) || "").trim();
  const usPerson = g("us_person") === "us";
  const legal_name = g("legal_name");
  const fed_tax_classification = g("fed_tax_classification") || "individual";
  const country_citizenship = g("country_citizenship");
  const dob = g("dob");
  if (!legal_name) return { ok: false, error: "Please enter your legal name." };
  if (!usPerson && !country_citizenship) {
    return { ok: false, error: "Please select your country of citizenship." };
  }
  return mergeTaxInfo({
    us_person: usPerson,
    form_type: usPerson ? "w9" : "w8",
    legal_name,
    fed_tax_classification,
    country_citizenship,
    dob,
  });
}

export async function saveTaxTin(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const g = (k: string) => String(formData.get(k) || "").trim();
  const tin = g("tin");
  const signature = g("signature");
  const sign_date = g("sign_date");
  const certified = formData.get("certified") === "on";
  const source_signature = g("source_signature");
  const source_certified = formData.get("source_certified") === "on";

  if (!tin) return { ok: false, error: "Please enter your tax identification number." };
  if (!signature) return { ok: false, error: "Please type your full legal name to sign." };
  if (!certified) return { ok: false, error: "Please check the certification box." };

  const res = await mergeTaxInfo({
    tin,
    signature,
    sign_date: sign_date || new Date().toISOString().slice(0, 10),
    certified,
    source_signature,
    source_certified,
  });

  if (res.ok) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await notify(
        supabase,
        user.id,
        "account",
        "Tax information submitted",
        "Your tax information was saved. You can now withdraw your available balance.",
        "/settings/tax"
      );
    }
  }
  return res;
}
