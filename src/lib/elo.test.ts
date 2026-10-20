import { describe, expect, it } from "vitest";
import { rateGame, teamRating, type RosterPlayer } from "./elo";

const p = (id: string, rating: number | null): RosterPlayer => ({ id, rating, gamesPlayed: 50 });
const delta = (r: ReturnType<typeof rateGame>, id: string) => r.changes.find((c) => c.id === id)!.delta;

describe("elite player with 11 average players (§3.7)", () => {
  const a = [p("elite", 2200), ...[1, 2, 3, 4, 5].map((i) => p(`a${i}`, 1500))];
  const b = [1, 2, 3, 4, 5, 6].map((i) => p(`b${i}`, 1500));

  it("gives the elite player little for a win", () => {
    const r = rateGame(a, b, "A", { kOverride: 32 });
    expect(delta(r, "elite")).toBeCloseTo(2.8, 1);
    expect(delta(r, "a1")).toBeCloseTo(13.3, 1);
    expect(delta(r, "b1")).toBeCloseTo(-10.8, 1);
  });

  it("costs the elite player the most on a tie or loss", () => {
    expect(delta(rateGame(a, b, "tie", { kOverride: 32 }), "elite")).toBeCloseTo(-13.2, 1);
    expect(delta(rateGame(a, b, "B", { kOverride: 32 }), "elite")).toBeCloseTo(-29.2, 1);
  });

  it("matches the pure team model when alpha = 0", () => {
    const r = rateGame(a, b, "A", { kOverride: 32, alpha: 0 });
    expect(delta(r, "elite")).toBeCloseTo(delta(r, "a1"), 6);
  });
});

describe("mixed indoor game with unrated players (§3.7)", () => {
  const a = [p("1600", 1600), p("1550", 1550), p("1500", 1500), p("1450", 1450), p("1400", 1400), p("guestA", null)];
  const b = [p("b1650", 1650), p("b1600", 1600), p("b1550", 1550), p("b1500", 1500), p("g1", null), p("g2", null)];

  it("averages only rated players and applies M = 0.75", () => {
    expect(teamRating(a)).toBe(1500);
    expect(teamRating(b)).toBe(1575);
    const r = rateGame(a, b, "A", { kOverride: 32 });
    expect(r.coverage).toBeCloseTo(0.75);
    expect(delta(r, "1600")).toBeCloseTo(12.9, 1);
    expect(delta(r, "1400")).toBeCloseTo(16.1, 1);
  });
});

describe("ties and minimums", () => {
  it("rewards the underdog for a tie (§3.4)", () => {
    const low = [1, 2, 3, 4, 5, 6].map((i) => p(`l${i}`, 1400));
    const high = [1, 2, 3, 4, 5, 6].map((i) => p(`h${i}`, 1700));
    const r = rateGame(low, high, "tie", { kOverride: 32 });
    expect(delta(r, "l1")).toBeCloseTo(11.2, 1);
    expect(delta(r, "h1")).toBeCloseTo(-11.2, 1);
  });

  it("gives everyone 0 for a tie between equal teams", () => {
    const r = rateGame([p("a", 1500), p("b", 1500)], [p("c", 1500), p("d", 1500)], "tie");
    r.changes.forEach((c) => expect(c.delta).toBeCloseTo(0));
  });

  it("does not rate a game when one side has no rated players", () => {
    const r = rateGame([p("a", 1500), p("g", null)], [p("g2", null), p("g3", null)], "A");
    expect(r.rated).toBe(false);
  });

  it("uses K = 48 for provisional players", () => {
    const r = rateGame([{ id: "new", rating: 1500, gamesPlayed: 2 }], [p("x", 1500)], "A");
    expect(r.changes[0].k).toBe(48);
  });
});
