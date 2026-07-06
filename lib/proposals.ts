// A job accepts at most this many applicants (first come, first served).
export const MAX_APPLICANTS = 50;

// Display bucket for a job's proposal count, in steps of 5 up to the cap:
// "Less than 5", "5 to 10", "10 to 15", … "45 to 50", then "50 (full)".
export function proposalsBucket(n: number): string {
  if (n < 5) return "Less than 5";
  if (n >= MAX_APPLICANTS) return `${MAX_APPLICANTS} (full)`;
  const lo = Math.floor(n / 5) * 5;
  return `${lo} to ${lo + 5}`;
}
