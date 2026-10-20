"use client";

import { ME, getPlayer, type QueueEntry } from "@/lib/data";
import { Avatar } from "../ui";

function FillPips({ have, need }: { have: number; need: number }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: need }).map((_, i) => (
        <span key={i} className={`h-2.5 w-4 rounded-[3px] ${i < have ? "bg-court" : "bg-line"}`} />
      ))}
    </span>
  );
}

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function QueuePanel({
  queue,
  teamSize,
  canJoinQueue,
  myEntryId,
  fillSecondsLeft,
  onJoinEntry,
  onStartEntry,
  onLeave,
}: {
  queue: QueueEntry[];
  teamSize: number;
  canJoinQueue: boolean;
  myEntryId: string | null;
  /** seconds left in the front entry's fill window, when one is running */
  fillSecondsLeft: number | null;
  onJoinEntry: (id: string) => void;
  onStartEntry: () => void;
  onLeave: () => void;
}) {
  return (
    <section aria-labelledby="queue-title" className="rounded-[var(--radius-panel)] border border-line bg-surface">
      <div className="flex items-baseline justify-between gap-3 border-b border-line-2 px-5 pb-3 pt-4">
        <h2 id="queue-title" className="display text-[1.7rem] font-bold">
          Up next
        </h2>
        <span className="text-[0.88rem] text-ink-2">
          {queue.length === 0 ? "Nobody waiting" : `${queue.length} ${queue.length === 1 ? "team" : "teams"} in line`}
        </span>
      </div>

      {queue.length === 0 ? (
        <p className="px-5 py-5 text-[0.95rem] text-ink-2">
          Get in line to play the winners. Bring a full team, or start one and others can fill it.
        </p>
      ) : (
        <ol className="divide-y divide-line-2">
          {queue.map((entry, index) => {
            const have = entry.members.length;
            const ready = have >= teamSize;
            const mine = entry.id === myEntryId;
            const filling = index === 0 && fillSecondsLeft !== null && !ready;
            const canJoin = canJoinQueue && !mine && !ready;
            return (
              <li key={entry.id} className={`px-5 py-4 ${filling ? "bg-ball-tint" : mine ? "bg-court-tint/60" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="display num w-6 shrink-0 text-[1.6rem] font-bold leading-none text-ink-3" aria-label={`Position ${index + 1}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="font-semibold text-ink">
                        {entry.name}
                        {mine && <span className="ml-1.5 text-[0.82rem] font-medium text-court">your team</span>}
                      </p>
                      <span className={`text-[0.85rem] font-semibold ${ready ? "text-up" : "text-ink-2"}`}>
                        {ready ? "Ready" : `Needs ${teamSize - have}`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <FillPips have={have} need={teamSize} />
                      <span className="num text-[0.8rem] text-ink-3">
                        {have}/{teamSize}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <span className="flex -space-x-1.5">
                        {entry.members.map((id) => {
                          const pl = getPlayer(id);
                          return pl ? <Avatar key={id} player={pl} size={26} ring={id === ME ? "me" : undefined} className="ring-2 ring-surface" /> : null;
                        })}
                      </span>
                      <span className="text-[0.8rem] text-ink-3">In line since {entry.queuedAt}</span>
                    </div>

                    {filling && (
                      <p role="status" className="mt-3 rounded-lg bg-ball px-3 py-2 text-[0.88rem] font-medium text-ink">
                        <span className="num font-bold">{formatClock(fillSecondsLeft!)}</span> to find {teamSize - have} more.
                        If they don&rsquo;t fill, the next ready team takes the court and they keep their place behind them.
                      </p>
                    )}

                    {(canJoin || mine) && (
                      <div className="mt-3 flex gap-2">
                        {canJoin && (
                          <button
                            onClick={() => onJoinEntry(entry.id)}
                            className="min-h-10 rounded-[var(--radius-control)] bg-ink px-4 text-[0.9rem] font-semibold text-white"
                          >
                            Join {entry.name}
                          </button>
                        )}
                        {mine && (
                          <button onClick={onLeave} className="min-h-10 rounded-[var(--radius-control)] px-3 text-[0.9rem] font-medium text-ink-2 underline underline-offset-2">
                            Leave the queue
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {canJoinQueue && !myEntryId && (
        <div className="border-t border-line-2 px-5 py-4">
          <button
            onClick={onStartEntry}
            className="min-h-11 w-full rounded-[var(--radius-control)] border-2 border-ink px-4 font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Start a team in the queue
          </button>
          <p className="mt-2 text-[0.82rem] text-ink-3">Full teams get priority. A team that&rsquo;s still filling keeps its place in line.</p>
        </div>
      )}
    </section>
  );
}
