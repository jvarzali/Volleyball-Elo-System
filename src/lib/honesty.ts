// Disputes, dishonesty points, strikes, and the flag (PLAN.md §5). Pure functions only.

export type Vote = "confirm" | "dispute";
export type VoteOutcome = "unchallenged" | "stands" | "overturned" | "split";

export interface VoteResolution {
  outcome: VoteOutcome;
  confirms: number;
  disputes: number;
  /** dishonesty points per voter, before strikes */
  points: Map<string, number>;
}

export const LIFETIME_THRESHOLD = 0.15;
export const RECENT_THRESHOLD = 0.2;
export const RECENT_WINDOW = 10;
export const STARTING_STRIKES = 2;

export function resolveVotes(votes: Array<{ userId: string; vote: Vote }>): VoteResolution {
  const confirms = votes.filter((v) => v.vote === "confirm").length;
  const disputes = votes.length - confirms;
  const points = new Map<string, number>();

  let outcome: VoteOutcome;
  if (disputes === 0) outcome = "unchallenged";
  else if (confirms >= 2 * disputes) outcome = "stands";
  else if (disputes >= 2 * confirms) outcome = "overturned";
  else outcome = "split";

  for (const v of votes) {
    let p = 0;
    if (outcome === "stands" && v.vote === "dispute") p = 1;
    if (outcome === "overturned" && v.vote === "confirm") p = 1;
    if (outcome === "split") p = 0.25;
    points.set(v.userId, p);
  }

  return { outcome, confirms, disputes, points };
}

/** Spend strikes instead of points (§5.5). A last half strike forgives anything. */
export function applyStrikes(points: number, strikesRemaining: number) {
  if (points <= 0 || strikesRemaining <= 0) return { points, strikesUsed: 0 };
  const cost = points >= 1 ? 1 : 0.5;
  const used = Math.min(cost, strikesRemaining);
  return { points: 0, strikesUsed: used };
}

/** history: points per ended game, oldest first. */
export function flagStatus(history: number[]) {
  const n = history.length;
  const total = history.reduce((s, p) => s + p, 0);
  const recent = history.slice(-RECENT_WINDOW);
  const lifetime = n === 0 ? 0 : total / n;
  const recentAvg = recent.length === 0 ? 0 : recent.reduce((s, p) => s + p, 0) / recent.length;
  return {
    lifetime,
    recent: recentAvg,
    flagged: lifetime > LIFETIME_THRESHOLD || recentAvg > RECENT_THRESHOLD,
  };
}
