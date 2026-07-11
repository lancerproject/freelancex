// xWork milestone escrow state machine.
//
// This is the single authority on which status changes are legal. Because
// this is money, every transition is explicit — any transition NOT listed
// here is rejected. Actions must call `assertTransition()` before writing a
// new status (inside the same locked DB transaction that posts the ledger
// rows), so an illegal or racing change can never move funds.

export type MilestoneStatus =
  | "FUNDED"
  | "IN_REVIEW"
  | "PENDING"
  | "AVAILABLE"
  | "WITHDRAWN"
  | "CANCELLATION_WINDOW"
  | "DISPUTE_HELD"
  | "REFUNDED";

// The event/actor that drives each transition — used for the audit log and to
// keep server actions honest about who is allowed to trigger what.
export type TransitionEvent =
  | "submit_work" // freelancer
  | "approve" // client
  | "auto_approve" // system job (client inaction ≥ N days)
  | "reject" // client → back to work in progress
  | "clear" // system job (security period elapsed)
  | "withdraw" // freelancer (payout)
  | "cancel_contract" // client ends / rejects entirely
  | "refund" // freelancer voluntary OR system auto-refund
  | "open_dispute" // freelancer
  | "resolve_release" // admin → toward freelancer
  | "resolve_refund" // admin → toward client
  | "resolve_split"; // admin → partial each side

type Rule = { from: MilestoneStatus; to: MilestoneStatus; event: TransitionEvent };

// The complete, explicit transition table. Nothing else is permitted.
const RULES: Rule[] = [
  // Normal delivery path
  { from: "FUNDED", to: "IN_REVIEW", event: "submit_work" },
  { from: "IN_REVIEW", to: "FUNDED", event: "reject" },
  { from: "IN_REVIEW", to: "PENDING", event: "approve" },
  { from: "IN_REVIEW", to: "PENDING", event: "auto_approve" },
  { from: "PENDING", to: "AVAILABLE", event: "clear" },
  { from: "AVAILABLE", to: "WITHDRAWN", event: "withdraw" },

  // Cancellation / refund path (client won't release)
  { from: "FUNDED", to: "CANCELLATION_WINDOW", event: "cancel_contract" },
  { from: "IN_REVIEW", to: "CANCELLATION_WINDOW", event: "cancel_contract" },
  { from: "CANCELLATION_WINDOW", to: "REFUNDED", event: "refund" },
  { from: "CANCELLATION_WINDOW", to: "DISPUTE_HELD", event: "open_dispute" },

  // Dispute path — ONLY an admin decision moves money out of DISPUTE_HELD.
  { from: "DISPUTE_HELD", to: "PENDING", event: "resolve_release" },
  { from: "DISPUTE_HELD", to: "REFUNDED", event: "resolve_refund" },
  { from: "DISPUTE_HELD", to: "PENDING", event: "resolve_split" }, // released part clears normally; refunded part is ledgered in the same action
];

// Terminal states — money has left escrow; no further transitions allowed.
export const TERMINAL: ReadonlySet<MilestoneStatus> = new Set<MilestoneStatus>([
  "WITHDRAWN",
  "REFUNDED",
]);

export function isTerminal(status: MilestoneStatus): boolean {
  return TERMINAL.has(status);
}

// Is (from → to) allowed at all (optionally for a specific event)?
export function canTransition(
  from: MilestoneStatus,
  to: MilestoneStatus,
  event?: TransitionEvent
): boolean {
  return RULES.some(
    (r) => r.from === from && r.to === to && (event ? r.event === event : true)
  );
}

// The set of statuses reachable from `from` (handy for UI/tests).
export function nextStates(from: MilestoneStatus): MilestoneStatus[] {
  return [...new Set(RULES.filter((r) => r.from === from).map((r) => r.to))];
}

// The legal target(s) for a given event from a given status.
export function targetFor(
  from: MilestoneStatus,
  event: TransitionEvent
): MilestoneStatus | null {
  const rule = RULES.find((r) => r.from === from && r.event === event);
  return rule ? rule.to : null;
}

export class IllegalTransitionError extends Error {
  constructor(
    public from: MilestoneStatus,
    public to: MilestoneStatus,
    public event?: TransitionEvent
  ) {
    super(
      `Illegal milestone transition: ${from} → ${to}` +
        (event ? ` (event: ${event})` : "")
    );
    this.name = "IllegalTransitionError";
  }
}

// Throw unless the transition is explicitly allowed. Call this inside the
// locked transaction, AFTER re-reading the current status under the lock, so a
// concurrent action that already moved the milestone makes this one fail.
export function assertTransition(
  from: MilestoneStatus,
  to: MilestoneStatus,
  event?: TransitionEvent
): void {
  if (!canTransition(from, to, event)) {
    throw new IllegalTransitionError(from, to, event);
  }
}
