// Resume logic for the "Create your profile" wizard.
//
// Every wizard step saves to the DB and records the NEXT step in
// `profiles.profile_step`. So if a freelancer loses connection or closes the
// tab partway through, their next login drops them back exactly where they
// left off — just like Upwork.
//
// `profile_step` values are the step slugs below, plus "done" once the profile
// is published. A null/empty value means the user never started the wizard
// (e.g. an older account) — those users are left on the dashboard untouched.

export const WIZARD_STEPS = [
  "work",
  "skills",
  "title",
  "experience",
  "education",
  "languages",
  "overview",
  "rate",
  "details",
  "preview",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

// Returns the path to resume at, or null if there's nothing to resume
// (not a freelancer, never started, or already finished).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wizardResumePath(profile: any): string | null {
  if (!profile || profile.role !== "freelancer") return null;

  const step = (profile.profile_step as string | null) || "";
  if (!step || step === "done") return null;

  if ((WIZARD_STEPS as readonly string[]).includes(step)) {
    return `/create-profile/${step}`;
  }
  return null;
}
