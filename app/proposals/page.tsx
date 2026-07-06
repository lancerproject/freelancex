import React from "react";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import { hireFreelancer } from "./actions";

export default async function ProposalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Freelancers manage their proposals & offers in the freelancer hub — this
  // page only makes sense for a client reviewing proposals on their own jobs.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "client") {
    redirect("/freelancer");
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("client_id", user.id);

  const jobIds = jobs?.map((job) => job.id) || [];

  const { data: proposals } = await supabase
    .from("proposals")
    .select("*")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen px-4 lg:px-8 py-10">
      <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Job Proposals
      </h1>

      <div className="space-y-4">
        {proposals?.map((proposal) => (
          <div
            key={proposal.id}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <p>
              <strong>Cover Letter:</strong>{" "}
              {proposal.cover_letter}
            </p>

            <p>
              <strong>Bid:</strong> $
              {proposal.bid_amount}
            </p>

            <p>
              <strong>Delivery:</strong>{" "}
              {proposal.delivery_days} days
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {proposal.status === "accepted"
                ? "Hired"
                : proposal.status}
            </p>

            {proposal.status === "pending" ? (
              <form
                action={hireFreelancer.bind(
                  null,
                  proposal.id
                )}
                className="mt-4"
              >
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg transition"
                >
                  Hire Freelancer
                </button>
              </form>
            ) : (
              <p className="mt-4 text-primary font-semibold">
                Freelancer Hired
              </p>
            )}
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}