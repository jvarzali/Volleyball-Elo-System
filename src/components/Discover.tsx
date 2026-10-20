"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ROTATION_LABELS, teamSizeFor } from "@/lib/court";
import { ME, games, getPlayer, locationById, type Format, type Game } from "@/lib/data";
import { teamRating } from "@/lib/elo";
import { JoinCode } from "./JoinCode";
import { Avatar, CourtGlyph, FormatTag } from "./ui";

type Filter = "all" | Format;

const groups: Array<{ day: Game["day"]; title: string; empty: string }> = [
  { day: "live", title: "On court now", empty: "Nobody's playing right now. Start a game and others nearby will see it." },
  { day: "today", title: "Later today", empty: "Nothing else is scheduled today." },
  { day: "week", title: "This week", empty: "Nothing scheduled this week yet." },
];

function avgRating(g: Game) {
  const ids = [...g.teamA, ...g.teamB, ...g.queue.flatMap((q) => q.members)];
  const r = teamRating(ids.map((id) => ({ id, rating: getPlayer(id)?.[g.format].rating ?? null })));
  return r === null ? null : Math.round(r);
}

function queueSummary(g: Game) {
  if (g.queue.length === 0) return null;
  const size = teamSizeFor(g.format);
  const ready = g.queue.filter((q) => q.members.length >= size).length;
  const forming = g.queue.length - ready;
  const parts = [];
  if (ready) parts.push(`${ready} ${ready === 1 ? "team" : "teams"}`);
  if (forming) parts.push(`${forming} forming`);
  return `${parts.join(", ")} in queue`;
}

function GameRow({ game }: { game: Game }) {
  const loc = locationById.get(game.locationId)!;
  const size = teamSizeFor(game.format);
  const everyone = [...game.teamA, ...game.teamB, ...game.queue.flatMap((q) => q.members)];
  const mine = everyone.includes(ME);
  const avg = avgRating(game);
  const queue = queueSummary(game);
  const faces = everyone.slice(0, 5).map((id) => getPlayer(id)!);
  const open = size * 2 - game.teamA.length - game.teamB.length;

  return (
    <li>
      <Link
        href={`/g/${game.code}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-4 transition-colors hover:bg-line-2/60 sm:px-5"
      >
        <CourtGlyph format={game.format} a={game.teamA.length} b={game.teamB.length} live={game.status === "live"} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[1.05rem] font-semibold text-ink">{loc.name}</span>
            {mine && <span className="rounded-full bg-ball px-2 py-0.5 text-[0.75rem] font-semibold text-ink">You&rsquo;re here</span>}
          </div>
          <p className="mt-0.5 text-[0.92rem] text-ink-2">
            <span className="font-medium text-ink">Court {game.court}</span>
            <span className="mx-1.5 text-line" aria-hidden="true">/</span>
            {game.start}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] text-ink-2">
            <FormatTag format={game.format} />
            <span>{ROTATION_LABELS[game.rotation].short}</span>
            {game.skill && <span className="text-ink-3">{game.skill}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          {avg !== null && (
            <span className="display num text-[1.6rem] font-bold text-ink" aria-label={`Average rating ${avg}`}>
              {avg}
            </span>
          )}
          <span className="hidden -space-x-1 sm:flex" aria-hidden="true">
            {faces.map((pl) => (
              <Avatar key={pl.id} player={pl} size={28} className="ring-2 ring-surface" />
            ))}
          </span>
          <ChevronRight size={18} className="text-ink-3 transition-transform group-hover:translate-x-0.5 sm:hidden" aria-hidden="true" />
        </div>
        <p className="col-span-3 mt-1 text-[0.85rem] text-ink-2 sm:col-span-1 sm:col-start-2">
          {game.status === "live" ? (
            queue ? <span className="font-medium text-court">{queue}</span> : <span>No one waiting. Next game is yours.</span>
          ) : open > 0 ? (
            <span>
              <span className="font-medium text-ink">{open} open {open === 1 ? "spot" : "spots"}</span>, {game.teamA.length + game.teamB.length} going
            </span>
          ) : (
            <span>Teams full, queue open</span>
          )}
        </p>
      </Link>
    </li>
  );
}

export function Discover() {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = useMemo(() => games.filter((g) => filter === "all" || g.format === filter), [filter]);
  const liveCount = games.filter((g) => g.status === "live").length;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      <div className="min-w-0">
        <header className="mb-6">
          <h1 className="display text-[3.2rem] font-black text-ink sm:text-[4.2rem]">Who&rsquo;s playing</h1>
          <p className="mt-2 max-w-xl text-[1.05rem] text-ink-2">
            {liveCount} courts are running near Westside right now. Join a team, get in line for winners, or start your own game.
          </p>
        </header>

        <div role="radiogroup" aria-label="Format" className="mb-6 inline-flex rounded-full bg-line-2 p-1">
          {(["all", "indoor", "beach"] as const).map((f) => (
            <button
              key={f}
              role="radio"
              aria-checked={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-10 rounded-full px-4 text-[0.92rem] font-medium transition-colors ${
                filter === f ? "bg-surface text-ink shadow-[0_1px_2px_rgb(18_32_58/0.12)]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {f === "all" ? "All games" : f === "indoor" ? "Indoor" : "Beach"}
            </button>
          ))}
        </div>

        <div className="space-y-9">
          {groups.map(({ day, title, empty }) => {
            const list = shown.filter((g) => g.day === day);
            return (
              <section key={day} aria-labelledby={`group-${day}`}>
                <h2 id={`group-${day}`} className="display mb-2 text-[1.7rem] font-bold text-ink">
                  {title}
                  {day === "live" && list.length > 0 && (
                    <span className="ml-3 inline-block h-2.5 w-2.5 -translate-y-1 rounded-full bg-[#2fbf6f] align-middle" aria-hidden="true" />
                  )}
                </h2>
                {list.length ? (
                  <ul className="divide-y divide-line-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
                    {list.map((g) => (
                      <GameRow key={g.code} game={g} />
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-[var(--radius-panel)] border border-dashed border-line px-5 py-6 text-ink-2">
                    {empty}{" "}
                    {day === "live" && (
                      <Link href="/new" className="font-semibold text-court underline underline-offset-2">
                        Create a game
                      </Link>
                    )}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <aside className="order-first space-y-6 lg:order-none lg:sticky lg:top-24 lg:self-start">
        <JoinCode />
        <div className="hidden rounded-[var(--radius-panel)] border border-line bg-surface p-5 lg:block">
          <h2 className="font-semibold text-ink">Running your own game?</h2>
          <p className="mt-1 text-[0.95rem] text-ink-2">
            Pick a court and a time. Everyone who joins has the same say, and the court runs itself from there.
          </p>
          <Link
            href="/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-control)] border-2 border-ink px-4 font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Create a game
          </Link>
        </div>
      </aside>
    </div>
  );
}

