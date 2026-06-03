import React from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function MyJobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select(`
      *,
      proposals (
        id
      )
    `)
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">
        My Jobs
      </h1>

      <p className="mt-4">
        Total Jobs: {jobs?.length || 0}
      </p>

      <div className="mt-8 space-y-4">
        {jobs?.map((job) => (
          <div
            key={job.id}
            className="border rounded-lg p-4"
          >
            <h2 className="text-xl font-semibold">
              <Link
                href={`/jobs/${job.id}`}
                className="text-blue-600 hover:underline"
              >
                {job.title}
              </Link>
            </h2>

            <p className="mt-2">
              {job.description}
            </p>

            <p className="mt-2 font-medium">
              Proposals: {job.proposals?.length || 0}
            </p>

            <p className="mt-2 font-medium">
              Budget: ${job.budget}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}