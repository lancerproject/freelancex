import { describe, it, expect } from "vitest";
import {
  computeHealth,
  badgeForScore,
  VIOLATION_CATALOG,
  type HealthInputs,
  type ViolationRow,
  type ViolationType,
} from "../lib/health";

const NOW = new Date().toISOString();

function v(type: ViolationType, points?: number): ViolationRow {
  const cat = VIOLATION_CATALOG[type];
  return {
    id: `${type}-${Math.random()}`,
    violation_type: type,
    severity: cat.severity,
    points_deducted: points ?? cat.points,
    description: cat.description,
    status: "active",
    recorded_at: NOW,
    resolved_at: null,
  };
}

// A clean, verified freelancer baseline: identity +10 boost, no violations
// recorded → +5 clean-90d boost, so 100 (capped).
function base(over: Partial<HealthInputs> = {}): HealthInputs {
  return {
    activeViolations: [],
    allViolationDates: [],
    reviewRatings: [],
    completedJobs: 0,
    idVerified: true,
    isPro: false,
    accountStatus: "active",
    ...over,
  };
}

describe("computeHealth — deductions", () => {
  it("clean verified account scores 100", () => {
    const r = computeHealth(base());
    expect(r.score).toBe(100);
    expect(r.badge).toBe("excellent");
  });

  it("every catalog violation type reduces the score by its points", () => {
    for (const type of Object.keys(VIOLATION_CATALOG) as ViolationType[]) {
      if (type === "identity_not_verified") continue; // virtual — tested below
      const cat = VIOLATION_CATALOG[type];
      const r = computeHealth(base({ activeViolations: [v(type)], allViolationDates: [NOW] }));
      // baseline boosts: identity +10 (clean-90d lost since a violation exists)
      expect(r.score).toBe(Math.max(0, Math.min(100, 100 - cat.points + 10)));
    }
  });

  it("unverified identity applies the -20 virtual violation and loses +10", () => {
    const r = computeHealth(base({ idVerified: false }));
    // 100 - 20 (virtual) + 5 (clean 90d) = 85
    expect(r.score).toBe(85);
    expect(r.policyItems.some((i) => i.type === "identity_not_verified")).toBe(true);
  });

  it("caps job_cancelled at -20 total", () => {
    const r = computeHealth(
      base({
        activeViolations: [v("job_cancelled"), v("job_cancelled"), v("job_cancelled"), v("job_cancelled"), v("job_cancelled"), v("job_cancelled")],
        allViolationDates: [NOW],
      })
    );
    const item = r.policyItems.find((i) => i.type === "job_cancelled")!;
    expect(item.points).toBe(20);
    expect(item.count).toBe(6);
  });

  it("caps late_delivery at -15 total", () => {
    const r = computeHealth(
      base({
        activeViolations: [v("late_delivery"), v("late_delivery"), v("late_delivery"), v("late_delivery")],
        allViolationDates: [NOW],
      })
    );
    const item = r.policyItems.find((i) => i.type === "late_delivery")!;
    expect(item.points).toBe(15);
  });
});

describe("computeHealth — reviews", () => {
  it("deducts 8/5/2 for 1/2/3-star reviews and nothing for 4-5", () => {
    const r = computeHealth(base({ reviewRatings: [1, 2, 3, 4, 5] }));
    expect(r.reviewTotal).toBe(15);
  });

  it("caps review deductions at -30", () => {
    const r = computeHealth(base({ reviewRatings: [1, 1, 1, 1, 1, 1] })); // 48 raw
    expect(r.reviewTotal).toBe(30);
  });
});

describe("computeHealth — boosts", () => {
  it("applies all boosts but never exceeds 100", () => {
    const r = computeHealth(
      base({
        reviewRatings: [5, 5, 5, 5, 5, 5], // +10 max
        completedJobs: 9, // +5 max
        isPro: true, // +5
      })
    );
    expect(r.boostTotal).toBe(10 + 10 + 5 + 5 + 5); // identity + 5star + jobs + pro + clean90d
    expect(r.score).toBe(100);
  });

  it("loses the 90-day bonus when any violation is recent", () => {
    const r = computeHealth(base({ allViolationDates: [NOW] }));
    expect(r.boostItems.some((b) => b.label.startsWith("No violations"))).toBe(false);
  });
});

describe("computeHealth — hard caps", () => {
  it("suspended: boosts paused, score capped at 19, badge restricted", () => {
    const r = computeHealth(base({ accountStatus: "suspended" }));
    expect(r.boostTotal).toBe(0);
    expect(r.score).toBeLessThanOrEqual(19);
    expect(r.badge).toBe("restricted");
  });

  it("permanently suspended: score forced to 0", () => {
    const r = computeHealth(
      base({ accountStatus: "permanently_suspended", reviewRatings: [5, 5] })
    );
    expect(r.score).toBe(0);
    expect(r.badge).toBe("restricted");
  });

  it("score never goes below 0 even with stacked criticals", () => {
    const r = computeHealth(
      base({
        idVerified: false,
        activeViolations: [v("vpn_detected"), v("country_mismatch"), v("suspicious_ip"), v("admin_suspension"), v("soliciting_outside_platform")],
        allViolationDates: [NOW],
        reviewRatings: [1, 1, 1, 1],
      })
    );
    expect(r.score).toBe(0);
  });
});

describe("badgeForScore thresholds", () => {
  it("maps ranges to badges exactly", () => {
    expect(badgeForScore(100)).toBe("excellent");
    expect(badgeForScore(85)).toBe("excellent");
    expect(badgeForScore(84)).toBe("good");
    expect(badgeForScore(65)).toBe("good");
    expect(badgeForScore(64)).toBe("risk");
    expect(badgeForScore(45)).toBe("risk");
    expect(badgeForScore(44)).toBe("high_risk");
    expect(badgeForScore(20)).toBe("high_risk");
    expect(badgeForScore(19)).toBe("restricted");
    expect(badgeForScore(0)).toBe("restricted");
  });
});
