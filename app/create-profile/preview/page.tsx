import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { redirect } from "next/navigation";
import { WizardAccountMenu } from "@/components/wizard-account-menu";
import { submitProfile } from "@/app/create-profile/actions";
import { LocalTime } from "@/components/local-time";
import { TitleEditor } from "@/components/title-editor";
import { DescriptionEditor } from "@/components/description-editor";
import { HourlyRateEditor } from "@/components/hourly-rate-editor";
import { SkillsEditor } from "@/components/skills-editor";
import { ListSection } from "@/components/list-section";
import { AvatarPhotoEdit } from "@/components/avatar-photo-edit";
import { COUNTRIES } from "@/lib/countries";
import { CITIES } from "@/lib/cities";

export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS = Array.from({ length: 56 }, (_, i) => String(2030 - i));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toList(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default async function PreviewProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadOwnProfile(user.id);

  const name = profile?.full_name || "Your name";
  const first = name.split(" ")[0];
  const skills = String(profile?.skills || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const titleExample = skills[0] || "Sales & Marketing";
  const employment = toList(profile?.employment);
  const education = toList(profile?.education);
  const languages = toList(profile?.languages);
  const place =
    [profile?.city, profile?.state, profile?.country]
      .filter(Boolean)
      .join(", ") ||
    (profile?.location as string) ||
    "";

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="flex items-center justify-between px-8 py-4 border-b border-neutral-200">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>
        <WizardAccountMenu />
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6">Preview Profile</h1>

        {/* Banner */}
        <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-7 flex items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Looking good, {first}!</h2>
            <p className="text-neutral-600 mt-1">
              Make any edits you want, then submit your profile. You can make
              more changes after it&apos;s live.
            </p>
            <form action={submitProfile} className="mt-5">
              <button className="bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold hover:opacity-90">
                Submit profile
              </button>
            </form>
          </div>
          <div className="text-5xl shrink-0">📝</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Main */}
          <div className="space-y-6">
            {/* Identity + title + overview + rate */}
            <div className="rounded-2xl border border-neutral-200 p-6">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {/* opens the full "Your photo" editor (crop/move/zoom) */}
                  <AvatarPhotoEdit />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">{name}</h3>
                  {place && (
                    <p className="text-neutral-600 mt-1 flex items-center gap-1">
                      📍 {place}
                    </p>
                  )}
                  <p className="text-neutral-500 text-sm mt-0.5">
                    <LocalTime timezone={profile?.timezone} /> local time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <h4 className="text-xl font-semibold">
                  {profile?.title || "Your professional title"}
                </h4>
                <TitleEditor title={profile?.title} example={titleExample} />
              </div>

              <div className="flex items-start justify-between gap-4 mt-4">
                <p className="text-neutral-700 whitespace-pre-wrap">
                  {profile?.bio || "Your overview will appear here."}
                </p>
                <DescriptionEditor bio={profile?.bio} />
              </div>

              <div className="flex items-center gap-3 mt-6">
                <div>
                  <p className="text-xl font-bold">
                    ${profile?.hourly_rate || "0.00"}
                  </p>
                  <p className="text-neutral-500 text-sm">Hourly rate</p>
                </div>
                <HourlyRateEditor rate={profile?.hourly_rate} />
              </div>
            </div>

            {/* Skills */}
            <div className="rounded-2xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Skills</h3>
                <SkillsEditor skills={profile?.skills || ""} />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {skills.length ? (
                  skills.map((s: string) => (
                    <span
                      key={s}
                      className="bg-secondary text-foreground rounded-full px-3 py-1 text-sm"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500 text-sm">No skills yet.</span>
                )}
              </div>
            </div>

            {/* Work history (inline add/edit/delete) */}
            <div className="rounded-2xl border border-neutral-200 p-6">
              <ListSection
                name="employment"
                title="Work history"
                kind="employment"
                items={employment}
                isSelf
                emptyText="Add your work experience."
                blank={{ company: "", city: "", country: "", title: "", from_month: "", from_year: "", current: false, to_month: "", to_year: "", description: "" }}
                fields={[
                  { key: "company", label: "Company" },
                  { key: "city", label: "City", type: "combo", options: CITIES, half: true },
                  { key: "country", label: "Country", type: "combo", options: [...COUNTRIES], half: true },
                  { key: "title", label: "Title" },
                  { key: "from_month", label: "From month", type: "select", options: MONTHS, half: true },
                  { key: "from_year", label: "From year", type: "select", options: YEARS, half: true },
                  { key: "current", label: "I currently work here", type: "checkbox" },
                  { key: "to_month", label: "To month", type: "select", options: MONTHS, half: true },
                  { key: "to_year", label: "To year", type: "select", options: YEARS, half: true },
                  { key: "description", label: "Description (optional)", type: "textarea" },
                ]}
              />
            </div>

            {/* Education (inline add/edit/delete) */}
            <div className="rounded-2xl border border-neutral-200 p-6">
              <ListSection
                name="education"
                title="Education"
                kind="education"
                items={education}
                isSelf
                emptyText="Add your education."
                blank={{ school: "", degree: "", start_year: "", end_year: "" }}
                fields={[
                  { key: "school", label: "School" },
                  { key: "degree", label: "Degree / field of study" },
                  { key: "start_year", label: "Start year", type: "select", options: YEARS, half: true },
                  { key: "end_year", label: "End year", type: "select", options: YEARS, half: true },
                ]}
              />
            </div>
          </div>

          {/* Sidebar — Languages (inline add/edit/delete) */}
          <aside>
            <ListSection
              name="languages"
              title="Languages"
              kind="language"
              variant="plain"
              items={languages}
              isSelf
              emptyText="Add the languages you speak."
              blank={{ language: "", proficiency: "" }}
              fields={[
                { key: "language", label: "Language" },
                {
                  key: "proficiency",
                  label: "Proficiency level",
                  type: "select",
                  options: ["Basic", "Conversational", "Fluent", "Native or Bilingual"],
                },
              ]}
            />
          </aside>
        </div>

        <div className="flex justify-end mt-8">
          <form action={submitProfile}>
            <button className="bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold hover:opacity-90">
              Submit profile
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
