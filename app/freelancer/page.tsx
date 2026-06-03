import React from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function FreelancerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: proposals } = await supabase
    .from("proposals")
    .select(`
      *,
      jobs (
        id,
        title
      )
    `)
    .eq("freelancer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">
        Freelancer Dashboard
      </h1>

      <p className="mt-4">
        Welcome {user.email}
      </p>

      <p className="mt-4">
        Total Applications: {proposals?.length || 0}
      </p>

      <div className="mt-8 space-y-4">
        <h2 className="text-2xl font-semibold">
          My Applications
        </h2>

        {proposals?.map((proposal) => (
          <div
            key={proposal.id}
            className="border rounded-lg p-4"
          >
            <Link
              href={`/jobs/${proposal.jobs?.id}`}
              className="text-lg font-semibold text-blue-600 hover:underline"
            >
              {proposal.jobs?.title}
            </Link>

            <p className="mt-2">
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
          </div>
        ))}
      </div>
    </main>
  );
}