import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { redirect } from "next/navigation";
import { TaxSections } from "@/components/tax-sections";

export const metadata = { title: "Tax information | Xwork" };

export default async function TaxInformationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Own-row read via the service role (tax_info/address are revoked from the
  // authenticated role).
  const profile = await loadOwnProfile(user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let t: any = {};
  try {
    if (profile?.tax_info) t = JSON.parse(profile.tax_info);
  } catch {
    /* ignore */
  }

  return (
    <TaxSections
      initial={t}
      profile={{
        country: profile?.country || "",
        address1: profile?.address1 || "",
        address2: profile?.address2 || "",
        city: profile?.city || "",
        state: profile?.state || "",
        postal_code: profile?.postal_code || "",
        full_name: profile?.full_name || "",
      }}
    />
  );
}
