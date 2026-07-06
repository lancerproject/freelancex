// Single source of truth for freelancer profile completeness.
// Used by the dashboard sidebar bar, the "Complete your profile" popup,
// and the identity-verification rule — so they always agree.

export type ChecklistItem = {
  key: string;
  label: string;
  sub: string;
  weight: number;
  done: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function listLen(v: any): number {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function profileChecklist(profile: any): {
  items: ChecklistItem[];
  percent: number;
} {
  const items: ChecklistItem[] = [
    { key: "photo", label: "Profile photo", sub: "Take a professional picture", weight: 10, done: !!profile?.avatar_url },
    { key: "overview", label: "Overview", sub: "Add a bio highlighting your talent", weight: 15, done: !!String(profile?.bio || "").trim() },
    { key: "skills", label: "Skills", sub: "Showcase your expertise", weight: 15, done: !!String(profile?.skills || "").trim() },
    { key: "employment", label: "Employment history", sub: "Past job experiences and positions", weight: 15, done: listLen(profile?.employment) > 0 },
    { key: "portfolio", label: "Portfolio", sub: "Work samples, case studies, etc.", weight: 15, done: listLen(profile?.portfolio) > 0 },
    { key: "education", label: "Education", sub: "Include degrees and diplomas", weight: 10, done: listLen(profile?.education) > 0 },
    // Video introduction is optional — intentionally NOT part of the 100%.
    { key: "certifications", label: "Certifications", sub: "Recognized skills and knowledge", weight: 10, done: listLen(profile?.certifications) > 0 },
    { key: "other", label: "Other experiences", sub: "Anything else worth sharing", weight: 10, done: listLen(profile?.other_experiences) > 0 },
  ];
  const percent = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  return { items, percent };
}
