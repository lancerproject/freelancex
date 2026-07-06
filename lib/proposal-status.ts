// Shared proposal-status labels + badge styles, used by the job cards, the job
// detail page, and the View Proposal page so status wording/colors stay
// consistent everywhere (freelancer side).

export type ProposalStatus =
  | "pending"
  | "shortlisted"
  | "rejected"
  | "accepted"
  | "withdrawn";

// Human label the freelancer sees for each status.
export function proposalStatusLabel(status?: string | null): string {
  switch (status) {
    case "accepted":
      return "Hired";
    case "shortlisted":
      return "Shortlisted";
    case "rejected":
      return "Not selected";
    case "withdrawn":
      return "Withdrawn";
    case "pending":
    default:
      return "Pending";
  }
}

// Tailwind classes for the status pill.
export function proposalStatusClasses(status?: string | null): string {
  switch (status) {
    case "accepted":
      return "bg-primary/15 text-primary";
    case "shortlisted":
      return "bg-blue-500/10 text-blue-600";
    case "rejected":
      return "bg-neutral-200 text-neutral-500";
    case "withdrawn":
      return "bg-orange-100 text-orange-600";
    case "pending":
    default:
      return "bg-secondary text-muted-foreground";
  }
}

// A proposal counts as an active application (shows the "Applied" badge and
// blocks a duplicate application) unless it's been withdrawn.
export function isActiveProposal(status?: string | null): boolean {
  return !!status && status !== "withdrawn";
}

// A freelancer may withdraw only while the proposal is still open.
export function canWithdraw(status?: string | null): boolean {
  return status === "pending" || status === "shortlisted";
}
