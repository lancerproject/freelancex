"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// The profiles row always exists (created at signup), and the table has a
// NOT NULL `username` column. So we use UPDATE (not upsert) — upsert runs an
// INSERT-on-conflict that trips the NOT NULL constraint.

// Persists the avatar the moment it's attached, and refreshes cached pages.
export async function saveAvatar(url: string) {
  if (!url) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  revalidatePath("/create-profile/preview");
  revalidatePath("/create-profile/details");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

// Step 2 — chosen category + specialties.
export async function saveWorkCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const category = (formData.get("category") as string) || "";
  const specialties = (formData.get("specialties") as string) || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "skills" }; // remember where they are
  if (category) row.categories = category;
  if (specialties) row.specialties = specialties;

  if (Object.keys(row).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", user.id);
    if (error) {
      delete row.specialties;
      await supabase.from("profiles").update(row).eq("id", user.id);
    }
  }

  redirect("/create-profile/skills");
}

// Step 3 — skills.
export async function saveSkills(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const skills = (formData.get("skills") as string) || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "title" };
  if (skills) row.skills = skills;
  await supabase.from("profiles").update(row).eq("id", user.id);

  redirect("/create-profile/title");
}

// Step 4 — profile title.
export async function saveTitle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = (formData.get("title") as string) || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "experience" };
  if (title) row.title = title;
  await supabase.from("profiles").update(row).eq("id", user.id);

  redirect("/create-profile/experience");
}

// Step 5 — work experience (employment JSON).
export async function saveExperience(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employment = (formData.get("employment") as string) || "[]";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "education" };
  try {
    const list = JSON.parse(employment);
    if (Array.isArray(list) && list.length > 0) row.employment = employment;
  } catch {
    /* ignore malformed */
  }
  await supabase.from("profiles").update(row).eq("id", user.id);

  redirect("/create-profile/education");
}

// Step 6 — education (JSON).
export async function saveEducation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const education = (formData.get("education") as string) || "[]";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "languages" };
  try {
    const list = JSON.parse(education);
    if (Array.isArray(list) && list.length > 0) row.education = education;
  } catch {
    /* ignore malformed */
  }
  await supabase.from("profiles").update(row).eq("id", user.id);

  redirect("/create-profile/languages");
}

// Step 7 — languages (JSON).
export async function saveLanguages(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const languages = (formData.get("languages") as string) || "[]";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "overview" };
  try {
    const list = JSON.parse(languages);
    if (Array.isArray(list) && list.length > 0) row.languages = languages;
  } catch {
    /* ignore malformed */
  }
  await supabase.from("profiles").update(row).eq("id", user.id);

  redirect("/create-profile/overview");
}

// Step 8 — bio / overview.
export async function saveOverview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bio = (formData.get("bio") as string) || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "rate" };
  if (bio) row.bio = bio;
  await supabase.from("profiles").update(row).eq("id", user.id);

  redirect("/create-profile/rate");
}

// Step 9 — hourly rate.
export async function saveRate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rate = (formData.get("hourly_rate") as string) || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "details" };
  if (rate) row.hourly_rate = rate;
  await supabase.from("profiles").update(row).eq("id", user.id);

  redirect("/create-profile/details");
}

// Step 10 — photo, date of birth, country, address and phone.
export async function saveDetails(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const get = (k: string) => ((formData.get(k) as string) || "").trim();
  const avatar = get("avatar_url");
  const dob = get("dob");
  const country = get("country");
  const street = get("street");
  const apt = get("apt");
  const city = get("city");
  const state = get("state");
  const zip = get("zip");
  const phone = get("phone");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = { profile_step: "preview" };
  const locParts = [city, state, country].filter(Boolean);
  if (avatar) row.avatar_url = avatar;
  if (dob) row.dob = dob;
  if (country) row.country = country;
  if (locParts.length) row.location = locParts.join(", ");
  if (street) row.street_address = street;
  if (apt) row.apt_suite = apt;
  if (city) row.city = city;
  if (state) row.state = state;
  if (zip) row.zip = zip;
  if (phone) row.phone = phone;

  const { error } = await supabase
    .from("profiles")
    .update(row)
    .eq("id", user.id);
  if (error) {
    // If an optional column doesn't exist, save the safe ones so we don't block.
    console.log("Details save note:", error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safe: any = { profile_step: "preview" };
    if (avatar) safe.avatar_url = avatar;
    if (country) safe.country = country;
    if (locParts.length) safe.location = locParts.join(", ");
    if (city) safe.city = city;
    if (state) safe.state = state;
    await supabase.from("profiles").update(safe).eq("id", user.id);
  }

  revalidatePath("/create-profile/preview");
  revalidatePath("/profile");
  redirect("/create-profile/preview");
}

// Final step — publish the profile and go to the dashboard.
export async function submitProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ profile_visibility: "public", profile_step: "done" })
    .eq("id", user.id);

  redirect("/create-profile/ready");
}
