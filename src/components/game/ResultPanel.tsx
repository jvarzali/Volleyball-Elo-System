"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameResult } from "@/lib/court";
import type { GameRating } from "@/lib/elo";
import { resolveVotes, type Vote } from "@/lib/honesty";
import { ME, displayName, getPlayer, type Format } from "@/lib/data";
import { Avatar } from "../ui";

export interface LastGame {
  gameNumber: number;
  result: GameResult;
  score?: string;
  teamA: string[];
  teamB: string[];
  rating: GameRating | null;
  endedBy: string;
  votes: Array<{ userId: string; vote: Vote }>;
}

const OUTCOME_COPY = {
  unchallenged: "No disputes. This result will stand.",
  stands: "Disputed, but enough players confirmed it. The result would stand, and disputers would get a dishonesty point.",
  overturned: "Enough players disputed it. The game would be thrown out, and anyone who confirmed would get a dishonesty point.",
  split: "Split vote. The game would be thrown out, and everyone who voted would get a quarter point.",
};

function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function CountingDelta({ value }: { value: number }) {
  const v = useCountUp(value);
  const r = Math.round(v * 10) / 10;
  const up = value > 0.05;
  const down = value < -0.05;
  return (
    <span className={`display num text-[1.35rem] font-bold ${up ? "text-up" : down ? "text-down" : "text-ink-3"}`}>
      {up ? "+" : down ? "−" : "±"}
      {Math.abs(r).toFixed(1)}
    </span>
  );
}

export function ResultPanel({
  last,
  format,
  onVote,
  onRequeue,
  stillOnCourt,
  inQueue,
}: {
  last: LastGame;
  format: Format;
  onVote: (v: Vote) => void;
  onRequeue: (ids: string[], name: string) => void;
  stillOnCourt: (id: string) => boolean;
  inQueue: (id: string) => boolean;
}) {
  const ender = getPlayer(last.endedBy);
  const iPlayed = last.teamA.includes(ME) || last.teamB.includes(ME);
  const iEnded = last.endedBy === ME;
  const myVote = last.votes.find((v) => v.userId === ME)?.vote;
  const resolution = resolveVotes(last.votes);

  const headline =
    last.result === "A" ? "Team A won" : last.result === "B" ? "Team B won" : last.result === "tie" ? "Tie game" : "Didn't finish";

  const mySide = last.teamA.includes(ME) ? last.teamA : last.teamB.includes(ME) ? last.teamB : null;
  const offCourt = mySide?.filter((id) => !stillOnCourt(id) && !inQueue(id)) ?? [];
  const showRequeue = mySide !== null && offCourt.includes(ME) && offCourt.length > 0;

  const myChange = last.rating?.changes.find((c) => c.id === ME);
  const changes = last.rating?.changes ?? [];

  return (
    <section aria-labelledby="result-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1 basis-[300px]">
          <p className="text-[0.88rem] text-ink-2">Game {last.gameNumber} result</p>
          <h2 id="result-title" className="display mt-0.5 text-[2.3rem] font-extrabold">
            {headline}
            {last.score && <span className="num ml-3 text-[1.6rem] font-bold text-ink-2">{last.score}</span>}
          </h2>
          <p className="mt-1 text-[0.9rem] text-ink-2">
            Recorded by {iEnded ? "you" : ender ? displayName(ender) : "a player"}. Ratings update once the 24-hour dispute window closes.
          </p>
        </div>
        {myChange && (
          <div className="shrink-0 rounded-xl bg-paper px-4 py-3 text-right">
            <p className="text-[0.82rem] text-ink-2">Your change, pending</p>
            <CountingDelta value={myChange.delta} />
            <p className="num text-[0.8rem] text-ink-3">You were expected to win {Math.round(myChange.expectedScore * 100)}%</p>
          </div>
        )}
      </div>

      {last.rating && !last.rating.rated && (
        <p className="border-t border-line-2 px-5 py-3 text-[0.9rem] text-ink-2">Not rated. Each side needs at least one player with an account.</p>
      )}

      {changes.length > 0 && (
        <details className="group border-t border-line-2">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-[0.92rem] font-semibold text-court [&::-webkit-details-marker]:hidden">
            See everyone&rsquo;s change
            <ChevronDown size={18} className="text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-x-6 px-5 pb-4 sm:grid-cols-2">
            {(["A", "B"] as const).map((side) => (
              <ul key={side} className="divide-y divide-line-2">
                {changes
                  .filter((c) => c.side === side)
                  .map((c) => {
                    const pl = getPlayer(c.id)!;
                    return (
                      <li key={c.id} className="flex items-center gap-3 py-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${side === "A" ? "bg-court" : "bg-ball"}`} aria-hidden="true" />
                        <Avatar player={pl} size={26} />
                        <span className="min-w-0 flex-1 truncate text-[0.92rem]">{displayName(pl)}</span>
                        <span className="num text-[0.8rem] text-ink-3">{Math.round(c.expectedScore * 100)}%</span>
                        <span className="w-14 text-right">
                          <CountingDelta value={c.delta} />
                        </span>
                      </li>
                    );
                  })}
              </ul>
            ))}
          </div>
          <p className="px-5 pb-4 text-[0.82rem] text-ink-3">
            Percent is each player&rsquo;s chance to win going in, based on their own {format} rating and their team&rsquo;s.
          </p>
        </details>
      )}

      <div className="border-t border-line-2 bg-paper/60 px-5 py-4">
        {iPlayed && !iEnded ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.92rem] text-ink-2">
              {myVote ? OUTCOME_COPY[resolution.outcome] : "Something wrong? You don't need to do anything if this is right."}
            </p>
            <div className="flex shrink-0 gap-2" role="group" aria-label="Your response to this result">
              <button
                aria-pressed={myVote === "confirm"}
                onClick={() => onVote("confirm")}
                className={`min-h-11 rounded-[var(--radius-control)] px-4 text-[0.92rem] font-semibold ${
                  myVote === "confirm" ? "bg-up text-white" : "border-2 border-line text-ink"
                }`}
              >
                {myVote === "confirm" ? "Confirmed" : "Confirm"}
              </button>
              <button
                aria-pressed={myVote === "dispute"}
                onClick={() => onVote("dispute")}
                className={`min-h-11 rounded-[var(--radius-control)] px-4 text-[0.92rem] font-semibold ${
                  myVote === "dispute" ? "bg-down text-white" : "border-2 border-line text-ink"
                }`}
              >
                {myVote === "dispute" ? "Disputed" : "Dispute"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[0.92rem] text-ink-2">
            {iEnded ? "You recorded this. It stands unless someone who played disputes it." : OUTCOME_COPY[resolution.outcome]}
          </p>
        )}
        <p className="num mt-2 text-[0.82rem] text-ink-3">
          {resolution.confirms} confirm, {resolution.disputes} dispute
        </p>
        {showRequeue && (
          <button
            onClick={() => onRequeue(offCourt, "Your team")}
            className="mt-3 min-h-11 rounded-[var(--radius-control)] bg-ink px-4 text-[0.92rem] font-semibold text-white"
          >
            Requeue together ({offCourt.length})
          </button>
        )}
      </div>
    </section>
  );
}
