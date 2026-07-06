import { describe, it, expect } from "vitest";
import {
  computeTalentBadge,
  risingTalentChecks,
  topRatedChecks,
  topRatedPlusChecks,
  type BadgeInputs,
} from "../lib/talent-badges";

// A freelancer who clears every bar for Top Rated Plus.
const strong: BadgeInputs = {
  avgRating: 4.9,
  ratingCount: 12,
  hasNegativeReview12mo: false,
  earned12mo: 15000,
  profilePercent: 100,
  activeLast90d: true,
  jssScore: 95,
  jssHistory: Array.from({ length: 8 }, (_, i) => ({
    date: new Date(Date.now() - (8 - i) * 15 * 86400000).toISOString(),
    score: 95,
    badge: "top_rated",
  })),
  goodStanding: true,
  idVerified: true,
  hasPayoutMethod: true,
  firstContractAt: new Date(Date.now() - 200 * 86400000).toISOString(),
  availabilitySet: true,
  largeContract12mo: true,
  badgeBanUntil: null,
};

describe("talent badges", () => {
  it("awards Top Rated Plus to a proven high earner with a large contract", () => {
    expect(computeTalentBadge(strong)).toBe("top_rated_plus");
    expect(topRatedPlusChecks(strong).eligible).toBe(true);
  });

  it("awards Top Rated when Plus earnings/large-contract bars aren't met", () => {
    const i = { ...strong, earned12mo: 2000, largeContract12mo: false };
    expect(computeTalentBadge(i)).toBe("top_rated");
    expect(topRatedChecks(i).eligible).toBe(true);
  });

  it("awards Rising Talent to a strong newcomer without a JSS yet", () => {
    const i: BadgeInputs = {
      ...strong,
      earned12mo: 300,
      jssScore: null,
      jssHistory: [],
      firstContractAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      largeContract12mo: false,
    };
    expect(computeTalentBadge(i)).toBe("rising_talent");
    expect(risingTalentChecks(i).eligible).toBe(true);
  });

  it("gives no badge below the Rising Talent earnings bar", () => {
    const i: BadgeInputs = {
      ...strong,
      earned12mo: 100,
      jssScore: null,
      jssHistory: [],
      largeContract12mo: false,
    };
    expect(computeTalentBadge(i)).toBeNull();
  });

  it("blocks Rising Talent on negative feedback", () => {
    const i: BadgeInputs = {
      ...strong,
      earned12mo: 300,
      jssScore: null,
      jssHistory: [],
      largeContract12mo: false,
      hasNegativeReview12mo: true,
    };
    expect(computeTalentBadge(i)).toBeNull();
  });

  it("removes all badges during a policy ban", () => {
    const i: BadgeInputs = {
      ...strong,
      badgeBanUntil: new Date(Date.now() + 86400000).toISOString(),
    };
    expect(computeTalentBadge(i)).toBeNull();
  });

  it("requires a consistent score history for Top Rated", () => {
    const i: BadgeInputs = {
      ...strong,
      earned12mo: 2000,
      largeContract12mo: false,
      jssHistory: Array.from({ length: 8 }, (_, idx) => ({
        date: new Date(Date.now() - (8 - idx) * 15 * 86400000).toISOString(),
        score: idx < 4 ? 70 : 95, // only 4 of 8 strong
        badge: null,
      })),
    };
    expect(topRatedChecks(i).eligible).toBe(false);
  });
});
