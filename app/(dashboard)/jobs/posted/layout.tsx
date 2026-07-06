import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// The "job posted" celebration is part of the client-only posting flow.
export default async function JobPostedLayout({
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
