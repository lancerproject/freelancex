import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ServicesEditor } from "@/components/services-editor";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("services")
    .eq("id", user.id)
    .maybeSingle();

  const services = Array.isArray(profile?.services) ? profile.services : [];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Your services</h1>
        <p className="text-muted-foreground mb-6">
          Create ready-to-buy services with a fixed price and delivery time.
          Clients can find them in the Project Catalog and on your profile.
        </p>

        {saved && (
          <div className="mb-5 rounded-lg border border-primary/30 bg-primary/10 text-primary p-3 text-sm">
            Your services were saved.
          </div>
        )}

        <ServicesEditor initial={services} />
      </div>
    </main>
  );
}
