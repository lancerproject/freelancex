import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { setRole } from "./actions";

export const metadata = { title: "Choose your account type | Xwork" };

// Shown when a signed-in account has no valid role yet (missing/invalid in the
// DB). We NEVER guess a role — the user picks, we save it, then route them to
// the right dashboard. This is what stops a client ever seeing the freelancer
// UI (or vice-versa) because of a null role.
export default async function SelectRolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "freelancer" || profile?.role === "client") {
    redirect("/dashboard");
  }

  const chooseFreelancer = setRole.bind(null, "freelancer");
  const chooseClient = setRole.bind(null, "client");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-foreground">
          How do you want to use Xwork?
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose your account type to continue. This sets up the right
          experience for you.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <form action={chooseFreelancer}>
            <button className="w-full h-full rounded-2xl border border-border bg-card p-6 text-left hover:border-primary hover:bg-primary/5 transition cursor-pointer">
              <div className="text-3xl">💼</div>
              <p className="font-semibold text-foreground mt-3 text-lg">
                I&apos;m a freelancer
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Find work, send proposals, and get paid.
              </p>
            </button>
          </form>

          <form action={chooseClient}>
            <button className="w-full h-full rounded-2xl border border-border bg-card p-6 text-left hover:border-primary hover:bg-primary/5 transition cursor-pointer">
              <div className="text-3xl">🏢</div>
              <p className="font-semibold text-foreground mt-3 text-lg">
                I&apos;m a client
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Post jobs and hire talent.
              </p>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
