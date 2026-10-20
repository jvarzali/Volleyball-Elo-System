import { describe, expect, it } from "vitest";
import { applyStrikes, flagStatus, resolveVotes, type Vote } from "./honesty";

const votes = (c: number, d: number) => [
  ...Array.from({ length: c }, (_, i) => ({ userId: `c${i}`, vote: "confirm" as Vote })),
  ...Array.from({ length: d }, (_, i) => ({ userId: `d${i}`, vote: "dispute" as Vote })),
];

describe("resolveVotes (§5.2)", () => {
  it("is unchallenged with no disputes", () => expect(resolveVotes(votes(1, 0)).outcome).toBe("unchallenged"));
  it("stands at exactly 2x confirms", () => {
    const r = resolveVotes(votes(2, 1));
    expect(r.outcome).toBe("stands");
    expect(r.points.get("d0")).toBe(1);
    expect(r.points.get("c0")).toBe(0);
  });
  it("is overturned by one dispute against a flagged ender (0 confirms)", () => expect(resolveVotes(votes(0, 1)).outcome).toBe("overturned"));
  it("splits at 3 vs 2 and gives everyone 0.25", () => {
    const r = resolveVotes(votes(3, 2));
    expect(r.outcome).toBe("split");
    expect([...r.points.values()].every((p) => p === 0.25)).toBe(true);
  });
});

describe("strikes (§5.5)", () => {
  it("spends a full strike on a full point and half on a split", () => {
    expect(applyStrikes(1, 2)).toEqual({ points: 0, strikesUsed: 1 });
    expect(applyStrikes(0.25, 2)).toEqual({ points: 0, strikesUsed: 0.5 });
  });
  it("lets a last half strike forgive a full point", () => expect(applyStrikes(1, 0.5)).toEqual({ points: 0, strikesUsed: 0.5 }));
  it("applies points once strikes run out", () => expect(applyStrikes(1, 0)).toEqual({ points: 1, strikesUsed: 0 }));
});

describe("flagStatus (§5.4)", () => {
  it("flags instantly on a 3rd-game penalty after strikes", () => expect(flagStatus([0, 0, 1]).flagged).toBe(true));
  it("does not flag at exactly 0.20 recent", () => {
    const history = [...Array(50).fill(0), 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];
    expect(flagStatus(history).flagged).toBe(false);
  });
  it("flags at 3 points in the last 10", () => {
    const history = [...Array(50).fill(0), 1, 0, 1, 0, 1, 0, 0, 0, 0, 0];
    expect(flagStatus(history).flagged).toBe(true);
  });
});
