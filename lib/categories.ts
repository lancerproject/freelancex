// Shared taxonomy used across job posting, search, and filters.

export const CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "Design & Creative",
  "Writing & Translation",
  "Marketing & Sales",
  "Data & Analytics",
  "Admin & Customer Support",
  "Video & Animation",
  "Music & Audio",
  "Finance & Accounting",
  "Engineering & Architecture",
  "Cybersecurity & IT",
  "Other",
] as const;

export const JOB_TYPES = [
  { value: "fixed", label: "Fixed price" },
  { value: "hourly", label: "Hourly" },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry level" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
] as const;

export const DURATIONS = [
  { value: "less_than_7_days", label: "Less than 7 days" },
  { value: "less_than_1_month", label: "Less than 1 month" },
  { value: "1_to_3_months", label: "1 to 3 months" },
  { value: "3_to_6_months", label: "3 to 6 months" },
  { value: "more_than_6_months", label: "More than 6 months" },
] as const;

export function labelFor(
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined
): string {
  return list.find((x) => x.value === value)?.label ?? value ?? "";
}
