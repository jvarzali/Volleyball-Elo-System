// Elo engine (PLAN.md §3). Pure functions only — no framework or database code.

export type Side = "A" | "B";
export type RatedResult = "A" | "B" | "tie";

export interface RosterPlayer {
  id: string;
  /** null = guest / unrated */
  rating: number | null;
  /** rated games played in this format; drives the provisional K-factor */
  gamesPlayed?: number;
}

export interface EloOptions {
  /** weight of a player's own rating vs. their team's (§3.3) */
  alpha?: number;
  /** force one K for everyone (used by the worked examples in the plan) */
  kOverride?: number;
}

export interface PlayerChange {
  id: string;
  side: Side;
  ratingBefore: number;
  effectiveRating: number;
  expectedScore: number;
  k: number;
  delta: number;
  ratingAfter: number;
}

export interface GameRating {
  rated: boolean;
  reason?: "side_without_rated_player";
  teamRatingA: number | null;
  teamRatingB: number | null;
  coverage: number;
  changes: PlayerChange[];
}

export const DEFAULT_ALPHA = 0.5;
export const START_RATING = 1500;
export const PROVISIONAL_GAMES = 15;

export function kFactor(rating: number, gamesPlayed = PROVISIONAL_GAMES): number {
  if (gamesPlayed < PROVISIONAL_GAMES) return 48;
  if (rating >= 2000) return 24;
  return 32;
}

/** Average of the rated players on a side (§3.2). null when nobody is rated. */
export function teamRating(players: RosterPlayer[]): number | null {
  const rated = players.filter((p) => p.rating !== null) as Array<RosterPlayer & { rating: number }>;
  if (rated.length === 0) return null;
  return rated.reduce((sum, p) => sum + p.rating, 0) / rated.length;
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
}

/** Share of players in the game who have a rating (§3.5). */
export function coverageMultiplier(a: RosterPlayer[], b: RosterPlayer[]): number {
  const all = [...a, ...b];
  if (all.length === 0) return 0;
  return all.filter((p) => p.rating !== null).length / all.length;
}

function scoreFor(side: Side, result: RatedResult): number {
  if (result === "tie") return 0.5;
  return result === side ? 1 : 0;
}

/**
 * Per-player expected scores before a game, without a result.
 * Used to show "expected to win 64%" on the court.
 */
export function previewExpectations(a: RosterPlayer[], b: RosterPlayer[], options: EloOptions = {}) {
  const alpha = options.alpha ?? DEFAULT_ALPHA;
  const rA = teamRating(a);
  const rB = teamRating(b);
  const out = new Map<string, number>();
  if (rA === null || rB === null) return { teamA: null, teamB: null, players: out };
  for (const [players, own, opp] of [
    [a, rA, rB],
    [b, rB, rA],
  ] as const) {
    for (const p of players) {
      if (p.rating === null) continue;
      const eff = alpha * p.rating + (1 - alpha) * own;
      out.set(p.id, expectedScore(eff, opp));
    }
  }
  return { teamA: expectedScore(rA, rB), teamB: expectedScore(rB, rA), players: out };
}

/** Rate one game (§3.1–3.6). DNF games never reach this function. */
export function rateGame(
  a: RosterPlayer[],
  b: RosterPlayer[],
  result: RatedResult,
  options: EloOptions = {},
): GameRating {
  const alpha = options.alpha ?? DEFAULT_ALPHA;
  const rA = teamRating(a);
  const rB = teamRating(b);
  const coverage = coverageMultiplier(a, b);

  if (rA === null || rB === null) {
    return { rated: false, reason: "side_without_rated_player", teamRatingA: rA, teamRatingB: rB, coverage, changes: [] };
  }

  const changes: PlayerChange[] = [];
  const sides: Array<[Side, RosterPlayer[], number, number]> = [
    ["A", a, rA, rB],
    ["B", b, rB, rA],
  ];

  for (const [side, players, own, opp] of sides) {
    const s = scoreFor(side, result);
    for (const p of players) {
      if (p.rating === null) continue;
      const effectiveRating = alpha * p.rating + (1 - alpha) * own;
      const e = expectedScore(effectiveRating, opp);
      const k = options.kOverride ?? kFactor(p.rating, p.gamesPlayed);
      const delta = k * coverage * (s - e);
      changes.push({
        id: p.id,
        side,
        ratingBefore: p.rating,
        effectiveRating,
        expectedScore: e,
        k,
        delta,
        ratingAfter: p.rating + delta,
      });
    }
  }

  return { rated: true, teamRatingA: rA, teamRatingB: rB, coverage, changes };
}
