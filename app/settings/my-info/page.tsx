import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountInfo } from "@/components/account-info";
import { CompanyDetails } from "@/components/company-details";
import { CompanyContacts } from "@/components/company-contacts";
import { AiPreference } from "@/components/ai-preference";
import { FlashBanner } from "@/components/flash-banner";

export const metadata = { title: "My info | Xwork" };

export default async function MyInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; email_sent?: string; emailerror?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let sp: { saved?: string; email_sent?: string; emailerror?: string } = {};
  try {
    sp = (await searchParams) || {};
  } catch {
    /* ignore */
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name || profile?.username || "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");
  const isClient = profile?.role === "client";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My info</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isClient ? "This is a client account" : "Your account information"}
        </p>
      </div>

      {sp.saved === "1" && (
        <FlashBanner tone="success">✓ Your changes were saved.</FlashBanner>
      )}
      {sp.email_sent === "1" && (
        <FlashBanner tone="success">
          We sent a verification link to your new email. Confirm it, then sign in
          with your new email and the same password.
        </FlashBanner>
      )}
      {sp.emailerror && (
        <FlashBanner tone="error">
          We couldn&apos;t update your email — it may already be in use. Your
          other details were saved.
        </FlashBanner>
      )}

      <AccountInfo
        fullName={fullName}
        firstName={firstName}
        lastName={lastName}
        email={user.email || ""}
        avatarUrl={profile?.avatar_url}
        role={profile?.role}
        plan={profile?.plan}
      />

      <CompanyDetails
        companyName={profile?.company_name || ""}
        companyLogo={profile?.company_logo || ""}
      />

      <CompanyContacts owner={fullName} p={profile} />

      {/* Client account actions — Xwork is single-account, so no team /
          ownership transfer; the client can close the account (guarded so all
          contracts and disputes must be wrapped up first). */}
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <p className="text-foreground font-medium">
          {isClient ? "This is a client account" : "Account"}
        </p>
        <div className="mt-4">
          <Link
            href="/settings/close-account"
            className="inline-block border border-destructive/40 text-destructive rounded-full px-5 py-2 text-sm font-semibold hover:bg-destructive/10"
          >
            Close account
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-3 max-w-xl">
          You can close your account once all your contracts and disputes are
          closed and your balance is settled.
        </p>
      </div>

      <AiPreference optOut={!!profile?.ai_data_opt_out} />
    </div>
  );
}
