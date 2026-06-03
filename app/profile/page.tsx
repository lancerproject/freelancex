import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  async function updateProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const full_name = formData.get("full_name") as string;
    const bio = formData.get("bio") as string;
    const skills = formData.get("skills") as string;
    const location = formData.get("location") as string;
    const website = formData.get("website") as string;
    const phone = formData.get("phone") as string;

    await supabase
      .from("profiles")
      .update({
        full_name,
        bio,
        skills,
        location,
        website,
        phone,
      })
      .eq("id", user.id);

    redirect("/profile");
  }

  return (
    <main className="min-h-screen p-8 flex justify-center">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        <form action={updateProfile} className="space-y-4">
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium mb-1"
            >
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={profile?.full_name ?? ""}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium mb-1"
            >
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={profile?.bio ?? ""}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label
              htmlFor="skills"
              className="block text-sm font-medium mb-1"
            >
              Skills
            </label>
            <input
              id="skills"
              name="skills"
              type="text"
              defaultValue={profile?.skills ?? ""}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium mb-1"
            >
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              defaultValue={profile?.location ?? ""}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium mb-1"
            >
              Website
            </label>
            <input
              id="website"
              name="website"
              type="text"
              defaultValue={profile?.website ?? ""}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium mb-1"
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              defaultValue={profile?.phone ?? ""}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-3 rounded-lg font-medium"
          >
            Save
          </button>
        </form>
      </div>
    </main>
  );
}
