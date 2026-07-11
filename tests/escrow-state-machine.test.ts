import { describe, it, expect } from "vitest";
import {
  assertTransition,
  canTransition,
  isTerminal,
  nextStates,
  targetFor,
  IllegalTransitionError,
  type MilestoneStatus,
} from "../lib/escrow/state-machine";

describe("escrow state machine — legal transitions", () => {
  it("allows the normal delivery path", () => {
    expect(canTransition("FUNDED", "IN_REVIEW", "submit_work")).toBe(true);
    expect(canTransition("IN_REVIEW", "PENDING", "approve")).toBe(true);
    expect(canTransition("IN_REVIEW", "PENDING", "auto_approve")).toBe(true);
    expect(canTransition("PENDING", "AVAILABLE", "clear")).toBe(true);
    expect(canTransition("AVAILABLE", "WITHDRAWN", "withdraw")).toBe(true);
  });

  it("allows reject back to work-in-progress", () => {
    expect(canTransition("IN_REVIEW", "FUNDED", "reject")).toBe(true);
  });

  it("allows the cancellation + refund/dispute path", () => {
    expect(canTransition("FUNDED", "CANCELLATION_WINDOW", "cancel_contract")).toBe(true);
    expect(canTransition("CANCELLATION_WINDOW", "REFUNDED", "refund")).toBe(true);
    expect(canTransition("CANCELLATION_WINDOW", "DISPUTE_HELD", "open_dispute")).toBe(true);
  });

  it("only lets an admin decision leave DISPUTE_HELD", () => {
    expect(canTransition("DISPUTE_HELD", "PENDING", "resolve_release")).toBe(true);
    expect(canTransition("DISPUTE_HELD", "REFUNDED", "resolve_refund")).toBe(true);
    expect(canTransition("DISPUTE_HELD", "PENDING", "resolve_split")).toBe(true);
  });
});

describe("escrow state machine — illegal transitions are rejected", () => {
  it("cannot skip the review/clearance steps", () => {
    expect(canTransition("FUNDED", "PENDING")).toBe(false); // must go through IN_REVIEW
    expect(canTransition("FUNDED", "AVAILABLE")).toBe(false);
    expect(canTransition("IN_REVIEW", "AVAILABLE")).toBe(false); // must clear first
    expect(canTransition("PENDING", "WITHDRAWN")).toBe(false); // must clear first (security hold)
  });

  it("assertTransition throws on an illegal move", () => {
    expect(() => assertTransition("PENDING", "WITHDRAWN")).toThrow(IllegalTransitionError);
    expect(() => assertTransition("FUNDED", "REFUNDED")).toThrow();
  });

  it("blocks a self-service move out of DISPUTE_HELD (no auto timeout)", () => {
    expect(canTransition("DISPUTE_HELD", "AVAILABLE")).toBe(false);
    expect(canTransition("DISPUTE_HELD", "WITHDRAWN")).toBe(false);
    expect(canTransition("DISPUTE_HELD", "REFUNDED", "refund")).toBe(false); // only resolve_refund
  });
});

describe("escrow state machine — terminal states are locked", () => {
  it("marks WITHDRAWN and REFUNDED terminal", () => {
    expect(isTerminal("WITHDRAWN")).toBe(true);
    expect(isTerminal("REFUNDED")).toBe(true);
    expect(isTerminal("PENDING")).toBe(false);
  });

  it("blocks double-withdraw", () => {
    expect(canTransition("AVAILABLE", "WITHDRAWN", "withdraw")).toBe(true);
    // Once WITHDRAWN, nothing is reachable.
    expect(nextStates("WITHDRAWN")).toHaveLength(0);
    expect(() => assertTransition("WITHDRAWN", "WITHDRAWN", "withdraw")).toThrow();
  });

  it("blocks disputing / refunding an already-withdrawn milestone", () => {
    expect(canTransition("WITHDRAWN", "DISPUTE_HELD", "open_dispute")).toBe(false);
    expect(canTransition("WITHDRAWN", "REFUNDED")).toBe(false);
  });

  it("blocks any move out of a refunded milestone", () => {
    expect(nextStates("REFUNDED")).toHaveLength(0);
  });
});

describe("escrow state machine — concurrent approve vs dispute", () => {
  it("dispute is not reachable from IN_REVIEW (so approve+dispute can't both apply)", () => {
    // A milestone under review can only be approved/rejected — a dispute can
    // only be opened later from the cancellation window. This prevents an
    // approve and an open_dispute from both being valid on the same status.
    expect(targetFor("IN_REVIEW", "approve")).toBe("PENDING");
    expect(targetFor("IN_REVIEW", "open_dispute")).toBeNull();
  });

  it("targetFor returns the single legal destination per event", () => {
    const cases: [MilestoneStatus, Parameters<typeof targetFor>[1], MilestoneStatus | null][] = [
      ["FUNDED", "submit_work", "IN_REVIEW"],
      ["PENDING", "clear", "AVAILABLE"],
      ["CANCELLATION_WINDOW", "refund", "REFUNDED"],
      ["AVAILABLE", "clear", null],
    ];
    for (const [from, ev, expected] of cases) expect(targetFor(from, ev)).toBe(expected);
  });
});
