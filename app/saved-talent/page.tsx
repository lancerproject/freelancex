import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { TalentShell } from "@/components/talent-shell";
import { TalentCard, EmptyTalent } from "@/components/talent-bits";

export default async function SavedTalentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved } = await supabase
    .from("saved_talent")
    .select("talent_id")
    .eq("user_id", user.id);

  const ids = [...new Set((saved ?? []).map((s) => s.talent_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let talent: any[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, title, avatar_url")
      .in("id", ids);
    talent = data ?? [];
  }

  return (
    <TalentShell>
      <h1 className="text-2xl font-bold text-foreground mb-1">Saved talent</h1>
      <p className="text-muted-foreground mb-8">People you&apos;ve saved</p>

      {talent.length === 0 ? (
        <EmptyTalent line="You haven't saved anyone yet. Save talent that catches your eye to find them later." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {talent.map((f) => (
            <TalentCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </TalentShell>
  );
}
