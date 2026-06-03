import { hireFreelancer } from "../../proposals/actions";
import { createClient } from "../../../lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { applyToJob } from "./actions";
import Link from "next/link";

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) {
    notFound();
  }

  const { data: proposals } = await supabase
    .from("proposals")
    .select(`
      *,
      profiles (
        id,
        full_name,
        skills
      )
    `)
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  const { data: myProposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("job_id", id)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen p-8 flex justify-center">
      <div className="border rounded-xl p-6 max-w-2xl w-full">
        <h1 className="text-3xl font-bold">{job.title}</h1>

        <p className="mt-4">{job.description}</p>

        <p className="mt-4 font-medium">Budget: ${job.budget}</p>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold">
            Applicants ({proposals?.length || 0})
          </h2>

          <div className="mt-4 space-y-4">
            {proposals?.map((proposal) => {
              const profile = Array.isArray(proposal.profiles)
                ? proposal.profiles[0]
                : proposal.profiles;

              return (
                <div
                  key={proposal.id}
                  className="border rounded-lg p-4"
                >
                  {profile?.full_name && (
                    <p>
                      <strong>Name:</strong> {profile.full_name}
                    </p>
                  )}

                  {profile?.skills && (
                    <p>
                      <strong>Skills:</strong> {profile.skills}
                    </p>
                  )}

                  <p>
                    <strong>Bid:</strong> ${proposal.bid_amount}
                  </p>

                  <p>
                    <strong>Delivery:</strong> {proposal.delivery_days}{" "}
                    days
                  </p>

                  <p>
                    <strong>Status:</strong> {proposal.status}
                  </p>

                  <Link
                    href={`/profile/${proposal.freelancer_id}`}
                    className="inline-block mt-2 text-blue-600 hover:underline font-medium"
                  >
                    View Profile
                  </Link>

                  {proposal.status === "pending" && (
                    <form
                      action={hireFreelancer.bind(
                        null,
                        proposal.id
                      )}
                      className="mt-3"
                    >
                      <button
                        type="submit"
                        className="bg-green-600 text-white px-4 py-2 rounded-lg"
                      >
                        Hire Freelancer
                      </button>
                    </form>
                  )}

                  {proposal.status === "accepted" && (
                    <p className="mt-3 text-green-700 font-semibold">
                      Freelancer Hired
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {myProposal ? (
          <div className="mt-8 border rounded-lg p-4 bg-green-50">
            <p className="font-semibold">
              You have already applied
            </p>

            <p className="mt-2">
              <strong>Status:</strong>{" "}
              {myProposal.status === "accepted"
                ? "Hired"
                : myProposal.status}
            </p>
          </div>
        ) : (
          <form
            action={applyToJob.bind(null, job.id)}
            className="mt-8 space-y-4"
          >
            <textarea
              name="cover_letter"
              placeholder="Write your cover letter"
              className="w-full border rounded-lg p-3"
              required
            />

            <input
              type="number"
              name="bid_amount"
              placeholder="Your bid amount"
              className="w-full border rounded-lg p-3"
              required
            />

            <input
              type="number"
              name="delivery_days"
              placeholder="Delivery days"
              className="w-full border rounded-lg p-3"
              required
            />

            <button
              type="submit"
              className="bg-green-600 text-white px-5 py-3 rounded-xl"
            >
              Submit Proposal
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
