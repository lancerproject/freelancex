import SettingsNav from "@/components/settings-nav";
import { createClient } from "@/lib/supabase-server";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role;
  }

  return (
    <main className="min-h-screen px-4 lg:px-12 py-10 w-full max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12">
        {/* Left column: "Settings" title above the grouped nav (like Upwork) */}
        <aside>
          <h1 className="text-3xl font-bold text-foreground mb-6">Settings</h1>
          <SettingsNav role={role} />
        </aside>

        {/* Right column: the active settings page (wide, like Upwork) */}
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
