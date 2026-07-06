import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function ConnectedServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Did the user sign in with Google?
  const provider =
    (user.app_metadata?.provider as string) ||
    (user.app_metadata?.providers as string[] | undefined)?.[0] ||
    "email";
  const googleConnected = provider === "google";

  const Service = ({
    name,
    connected,
  }: {
    name: string;
    connected: boolean;
  }) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-0">
      <span className="text-foreground">{name}</span>
      <span
        className={`text-sm font-medium ${
          connected ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {connected ? "Connected ✓" : "Not connected"}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Connected services</h2>

      <div className="rounded-2xl border border-border bg-card p-6">
        <Service name="Google" connected={googleConnected} />
        <Service name="Email &amp; password" connected={!googleConnected} />
      </div>

      <p className="text-sm text-muted-foreground">
        Connected services let you sign in faster. You can sign in with Google
        or your email and password.
      </p>
    </div>
  );
}
