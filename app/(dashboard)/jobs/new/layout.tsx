import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Posting a job is a CLIENT feature — freelancers get work, they don't hire.
// The wizard itself is a client component, so the role check lives here.
export default async function NewJobLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "client") redirect("/dashboard");

  return <>{children}</>;
}
