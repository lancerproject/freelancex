// Where a job's client allows talent to be located. Most jobs are open to the
// whole world; a client may optionally restrict to a single country. This is a
// job-level eligibility setting — NOT the client's own country.
export function talentLocationLabel(job: {
  talent_location?: string | null;
}): string {
  const v = job?.talent_location;
  if (!v || v === "worldwide") return "Worldwide";
  return v;
}
