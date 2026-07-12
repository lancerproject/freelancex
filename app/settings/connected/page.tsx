import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const metadata = { title: "Connected services | Xwork" };

// Connected services = third-party app integrations (like Upwork's page).
// Login providers (Google / email) live under Password & Security.
export default async function ConnectedServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Connected services</h2>

      <div className="rounded-2xl border border-border bg-card py-16 px-6 flex flex-col items-center text-center">
        <div className="text-5xl" aria-hidden>
          💼
        </div>
        <p className="text-foreground mt-4">You have no connected services yet</p>
      </div>
    </div>
  );
}
