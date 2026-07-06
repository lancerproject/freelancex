import { describe, it, expect } from "vitest";
import { computeJss } from "../lib/jss";

describe("computeJss", () => {
  it("is not eligible without enough history", () => {
    const r = computeJss({
      ratings: [5],
      completed: 1,
      cancelled: 0,
      distinctClients: 1,
      repeatClients: 0,
    });
    expect(r.score).toBeNull();
    expect(r.eligible).toBe(false);
    expect(r.needed.length).toBeGreaterThan(0);
  });

  it("gives a perfect score for all-5-star, full completion", () => {
    const r = computeJss({
      ratings: [5, 5],
      completed: 2,
      cancelled: 0,
      distinctClients: 2,
      repeatClients: 1,
    });
    expect(r.eligible).toBe(true);
    expect(r.score).toBe(100);
  });

  it("lowers the score when contracts are cancelled", () => {
    const clean = computeJss({
      ratings: [5, 5],
      completed: 4,
      cancelled: 0,
      distinctClients: 2,
      repeatClients: 1,
    });
    const messy = computeJss({
      ratings: [5, 5],
      completed: 2,
      cancelled: 2,
      distinctClients: 2,
      repeatClients: 1,
    });
    expect(messy.score!).toBeLessThan(clean.score!);
  });

  it("stays within 0–100", () => {
    const r = computeJss({
      ratings: [1, 2, 3],
      completed: 3,
      cancelled: 5,
      distinctClients: 3,
      repeatClients: 0,
    });
    expect(r.score!).toBeGreaterThanOrEqual(0);
    expect(r.score!).toBeLessThanOrEqual(100);
  });
});
