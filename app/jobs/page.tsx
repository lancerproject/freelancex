import React from "react";
import { createClient } from "../../lib/supabase-server";

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">
        Browse Jobs
      </h1>

      <div className="flex flex-col gap-4">
        {jobs?.map((job) => (
          <div
            key={job.id}
            className="border p-4 rounded-xl"
          >
            <a
  href={`/jobs/${job.id}`}
  className="text-xl font-semibold text-blue-600"
>
  {job.title}
</a>

            <p className="mt-2">
              {job.description}
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