import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// "Your profile" → the rendered, inline-editable profile page (Upwork-style).
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let open = "";
  let view = "";
  try {
    const sp = (await searchParams) as { open?: string; view?: string };
    open = sp?.open || "";
    view = sp?.view || "";
  } catch {
    /* ignore */
  }
  const params = new URLSearchParams();
  if (open) params.set("open", open);
  if (view) params.set("view", view);
  const qs = params.toString();
  redirect(`/profile/${user.id}${qs ? `?${qs}` : ""}`);
}
