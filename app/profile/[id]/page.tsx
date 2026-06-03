import { createClient } from "../../../lib/supabase-server";
import { notFound } from "next/navigation";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 flex justify-center">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {profile.full_name && (
            <h1 className="text-4xl font-bold text-gray-900">
              {profile.full_name}
            </h1>
          )}

          {profile.role && (
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                profile.role === "freelancer"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {profile.role}
            </span>
          )}
        </div>

        <div className="space-y-6 text-gray-700">
          {profile.bio && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Bio
              </h2>
              <p className="leading-relaxed">{profile.bio}</p>
            </section>
          )}

          {profile.skills && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Skills
              </h2>
              <p>{profile.skills}</p>
            </section>
          )}

          {profile.location && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Location
              </h2>
              <p>{profile.location}</p>
            </section>
          )}

          {profile.website && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Website
              </h2>
              <a
                href={
                  profile.website.startsWith("http")
                    ? profile.website
                    : `https://${profile.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {profile.website}
              </a>
            </section>
          )}

          {profile.phone && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Phone
              </h2>
              <p>{profile.phone}</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
