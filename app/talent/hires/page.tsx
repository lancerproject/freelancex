import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { TalentShell } from "@/components/talent-shell";
import { TalentCard, EmptyTalent } from "@/components/talent-bits";

export default async function YourHiresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contracts } = await supabase
    .from("contracts")
    .select("freelancer_id")
    .eq("client_id", user.id);

  const ids = [...new Set((contracts ?? []).map((c) => c.freelancer_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hires: any[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, title, avatar_url")
      .in("id", ids);
    hires = data ?? [];
  }

  return (
    <TalentShell>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">Your hires</h1>
      </div>
      <p className="text-muted-foreground mb-8">People you&apos;ve worked with</p>

      {hires.length === 0 ? (
        <EmptyTalent line="You haven't hired anyone yet. Find the right person for your next project." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hires.map((f) => (
            <TalentCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </TalentShell>
  );
}
