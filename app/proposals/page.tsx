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
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">
        Job Proposals
      </h1>

      <div className="space-y-4">
        {proposals?.map((proposal) => (
          <div
            key={proposal.id}
            className="border rounded-xl p-4"
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
                  className="bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  Hire Freelancer
                </button>
              </form>
            ) : (
              <p className="mt-4 text-green-700 font-semibold">
                Freelancer Hired
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}