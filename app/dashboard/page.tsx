import React from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import { createProfile } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await createProfile();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      <p>
        Welcome, {user.email}
      </p>

      {profile?.role === "client" ? (
        <div className="bg-blue-100 p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-semibold">
            Client Dashboard
          </h2>

          <p>
            Post a Job and hire freelancers
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/jobs/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Post Job
            </Link>

            <Link
              href="/jobs"
              className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              View Jobs
            </Link>

            <Link
              href="/proposals"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              View Proposals
            </Link>

            <Link
              href="/jobs"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg"
            >
              My Jobs
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-green-100 p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-semibold">
            Freelancer Dashboard
          </h2>

          <p>
            Find jobs and complete your profile
          </p>

          <div className="flex gap-3">
            <Link
              href="/jobs"
              className="bg-green-600 text-white px-4 py-2 rounded-lg inline-block"
            >
              Browse Jobs
            </Link>

            <Link
              href="/freelancer"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block"
            >
              My Applications
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}