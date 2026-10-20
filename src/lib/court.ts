// Court rotation and queue rules (PLAN.md §4.8–4.9). Pure functions only.

import type { Side } from "./elo";

export type Rotation = "cap_2" | "cap_3" | "no_limit" | "rotation";
export type GameResult = Side | "tie" | "dnf";

export const FILL_WINDOW_SECONDS = 180;

export const ROTATION_LABELS: Record<Rotation, { name: string; short: string; detail: string }> = {
  cap_2: {
    name: "Win cap 2",
    short: "Winners stay, max 2 wins",
    detail: "Winners stay on for up to 2 straight wins, then both teams come off.",
  },
  cap_3: {
    name: "Win cap 3",
    short: "Winners stay, max 3 wins",
    detail: "Winners stay on for up to 3 straight wins, then both teams come off.",
  },
  no_limit: {
    name: "No limit",
    short: "Winners stay",
    detail: "Winners stay on for as long as they keep winning.",
  },
  rotation: {
    name: "Rotation",
    short: "Everyone rotates",
    detail: "No king of the court. Each team plays at most 2 games in a row, so one team is always cycling off.",
  },
};

export interface CourtState {
  /** the team that has been on the court longer; Team A in a chain's first game */
  holder: Side;
  holderWinStreak: number;
  holderGamesInRow: number;
  challengerGamesInRow: number;
}

export interface NextOnCourt {
  /** side that stays on, or null when both teams come off */
  stays: Side | null;
  /** how many teams the queue must supply */
  openSlots: 1 | 2;
  /** state the staying team carries into the next game (as its holder) */
  carry: { winStreak: number; gamesInRow: number } | null;
}

const other = (s: Side): Side => (s === "A" ? "B" : "A");

export function firstGameState(): CourtState {
  return { holder: "A", holderWinStreak: 0, holderGamesInRow: 0, challengerGamesInRow: 0 };
}

export function nextOnCourt(rotation: Rotation, state: CourtState, result: GameResult): NextOnCourt {
  if (result === "dnf") return { stays: null, openSlots: 2, carry: null };

  const holder = state.holder;
  const challenger = other(holder);
  const holderGames = state.holderGamesInRow + 1;
  const challengerGames = state.challengerGamesInRow + 1;

  if (result === "tie") {
    // Challenger stays on; a tie never counts as a win.
    return { stays: challenger, openSlots: 1, carry: { winStreak: 0, gamesInRow: challengerGames } };
  }

  const winner = result;
  const winnerGames = winner === holder ? holderGames : challengerGames;

  if (rotation === "rotation") {
    // Whoever has now played 2 in a row comes off. In the very first game nobody has, so the loser does.
    if (holderGames >= 2) {
      return { stays: challenger, openSlots: 1, carry: { winStreak: winner === challenger ? 1 : 0, gamesInRow: challengerGames } };
    }
    return { stays: winner, openSlots: 1, carry: { winStreak: 1, gamesInRow: winnerGames } };
  }

  const streak = winner === holder ? state.holderWinStreak + 1 : 1;
  const cap = rotation === "cap_2" ? 2 : rotation === "cap_3" ? 3 : Infinity;
  if (streak >= cap) return { stays: null, openSlots: 2, carry: null };
  return { stays: winner, openSlots: 1, carry: { winStreak: streak, gamesInRow: winnerGames } };
}

export interface QueueEntryLike {
  id: string;
  size: number;
}

export interface PickResult<T extends QueueEntryLike> {
  called: T[];
  /** remaining queue, in order */
  queue: T[];
  /** true when a forming entry is at the front and its fill window is still running */
  waitingForFill: boolean;
}

/**
 * Pick the next team(s) for the court (§4.9).
 * Front entry ready → called. Front entry forming → wait for the fill window,
 * then call the first ready entry (forming entries ahead slide back one slot),
 * or let the front entry play short-handed if nobody is ready.
 */
export function pickNext<T extends QueueEntryLike>(
  entries: T[],
  slots: number,
  teamSize: number,
  windowExpired: boolean,
): PickResult<T> {
  const queue = [...entries];
  const called: T[] = [];

  for (let slot = 0; slot < slots && queue.length > 0; slot++) {
    if (queue[0].size >= teamSize) {
      called.push(queue.shift()!);
      continue;
    }
    if (!windowExpired) return { called, queue, waitingForFill: true };
    const readyIndex = queue.findIndex((e) => e.size >= teamSize);
    const index = readyIndex === -1 ? 0 : readyIndex;
    called.push(queue.splice(index, 1)[0]);
  }

  return { called, queue, waitingForFill: false };
}

export type DepartureOutcome = "keeps" | "refill" | "loses";

/** A team holding the court that loses players between games (§4.8.1). */
export function holderDeparture(rosterSize: number, left: number): DepartureOutcome {
  if (left <= 0) return "keeps";
  if (left > rosterSize / 2) return "loses";
  return "refill";
}

export function teamSizeFor(format: "indoor" | "beach"): number {
  return format === "indoor" ? 6 : 2;
}
