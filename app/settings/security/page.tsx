import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { redirect } from "next/navigation";
import { TwoFactor } from "@/components/two-factor";
import { ChangePassword } from "@/components/change-password-modal";
import { ConnectProvider } from "@/components/connect-provider";
import { SecurityQuestionLink } from "@/components/security-question-link";
import { VerificationPreferences } from "@/components/verification-preferences";
import { SignOutOthers } from "@/components/sign-out-others";

export const metadata = { title: "Password and security | Xwork" };

// A non-interactive toggle for channels that need infrastructure we don't have
// yet (a mobile app / an SMS provider). Shown off, with an explanatory note.
function DisabledToggle() {
  return (
    <span
      aria-hidden
      className="relative w-12 h-7 rounded-full bg-neutral-200 shrink-0 opacity-60 cursor-not-allowed"
    >
      <span className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow" />
    </span>
  );
}

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sq?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const providers = (user.identities ?? []).map((i) => i.provider);
  const googleConnected = providers.includes("google");
  const appleConnected = providers.includes("apple");

  const profile = await loadOwnProfile(user.id);
  const hasQuestion = !!profile?.security_question;

  const row = "flex items-center justify-between gap-4 py-5";

  return (
    <div className="space-y-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-foreground">
        Password and security
      </h2>

      {sp.sq === "saved" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 text-primary p-3 text-sm">
          Your security question has been saved.
        </div>
      )}
      {sp.sq === "reset" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 text-primary p-3 text-sm">
          Your security question was reset successfully.
        </div>
      )}

      {/* ---------------- Login ---------------- */}
      <section>
        <h3 className="text-xl font-bold text-foreground">Login</h3>

        <div className="mt-2 divide-y divide-border">
          <div className="py-5">
            <p className="font-semibold text-foreground">Xwork password</p>
            <p className="text-muted-foreground text-sm mt-1">
              You&apos;ve set an Xwork password.{" "}
              <span className="inline-block align-baseline">
                <ChangePassword />
              </span>
            </p>
          </div>

          <div className={row}>
            <div>
              <p className="font-semibold text-foreground">Log in with Google</p>
              <p className="text-muted-foreground text-sm mt-1">
                {googleConnected
                  ? "You can log in with Google."
                  : "Not connected. You can choose to log in with Google."}
              </p>
            </div>
            <ConnectProvider provider="google" connected={googleConnected} />
          </div>

          <div className={row}>
            <div>
              <p className="font-semibold text-foreground">Log in with Apple</p>
              <p className="text-muted-foreground text-sm mt-1">
                {appleConnected
                  ? "You can log in with Apple."
                  : "Not connected. You can choose to log in with Apple."}
              </p>
            </div>
            <ConnectProvider provider="apple" connected={appleConnected} comingSoon />
          </div>
        </div>
      </section>

      {/* ---------------- Two-step verification ---------------- */}
      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">
            Two-step verification
          </h3>
          <VerificationPreferences
            initialMethod={profile?.twofa_preferred_method || ""}
            initialFrequency={profile?.twofa_frequency || "risky"}
          />
        </div>

        <div className="mt-2 divide-y divide-border">
          <div className={row}>
            <div>
              <p className="font-semibold text-foreground">
                Mobile app notifications
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Approve sign-in requests from the Xwork mobile app.{" "}
                <span className="text-muted-foreground/80">
                  (Available once the Xwork mobile app launches.)
                </span>
              </p>
            </div>
            <DisabledToggle />
          </div>

          <div className={row}>
            <div>
              <p className="font-semibold text-foreground">SMS text messages</p>
              <p className="text-muted-foreground text-sm mt-1">
                Verify one-time codes sent to your mobile number.{" "}
                <span className="text-muted-foreground/80">
                  (Coming soon.)
                </span>
              </p>
            </div>
            <DisabledToggle />
          </div>

          <div className="py-5">
            <TwoFactor />
          </div>

          <div className={row}>
            <div>
              <p className="font-semibold text-foreground">
                Security question and answer
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {hasQuestion
                  ? "You've set up a question to answer when you can't use your mobile device for two-step verification."
                  : "Set up a question to answer when you can't use your mobile device for two-step verification."}
              </p>
              <div className="mt-2">
                <SecurityQuestionLink hasQuestion={hasQuestion} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Devices & sessions ---------------- */}
      <section>
        <h3 className="text-xl font-bold text-foreground">
          Devices and sessions
        </h3>
        <div className="mt-2 py-5">
          <p className="font-semibold text-foreground">
            Where you&apos;re logged in
          </p>
          <p className="text-muted-foreground text-sm mt-1 mb-3">
            You&apos;re signed in on this device. If you&apos;ve signed in on a
            shared, public, or lost device, sign out everywhere else — this
            device stays logged in.
          </p>
          <SignOutOthers />
        </div>
      </section>
    </div>
  );
}
