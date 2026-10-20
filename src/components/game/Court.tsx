"use client";

import type { Side } from "@/lib/elo";
import { ME, displayName, getPlayer, type Format } from "@/lib/data";
import { Avatar, FlagBadge } from "../ui";

interface CourtProps {
  format: Format;
  teamA: string[];
  teamB: string[];
  ratingOf: (id: string) => number;
  expected?: Map<string, number>;
  arrived: Set<string>;
  /** shown on empty spots when the viewer can take them */
  onJoin?: (side: Side) => void;
  canJoin: (side: Side) => boolean;
}

function PlayerChip({
  id,
  side,
  rating,
  expected,
  arrivedIndex,
}: {
  id: string;
  side: Side;
  rating: number;
  expected?: number;
  arrivedIndex: number | null;
}) {
  const pl = getPlayer(id);
  if (!pl) return null;
  const me = id === ME;
  const teamB = side === "B";
  return (
    <li
      className={`relative flex min-h-[64px] min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 ${
        teamB ? "bg-ball text-ink" : "bg-white text-ink"
      } ${me ? "outline-[3px] outline-offset-2 outline-ink outline" : ""} ${arrivedIndex !== null ? "take-court" : ""}`}
      style={arrivedIndex !== null ? ({ "--i": arrivedIndex } as React.CSSProperties) : undefined}
    >
      <Avatar player={pl} size={34} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[0.92rem] font-semibold">
          {displayName(pl)}
          {me && <span className="ml-1 text-[0.8rem] font-medium text-ink-2">(you)</span>}
        </p>
        <p className="mt-0.5 flex items-baseline gap-2 whitespace-nowrap">
          <span className="display num text-[1.25rem] font-bold">{Math.round(rating)}</span>
          {expected !== undefined && (
            <span className={`num text-[0.78rem] font-semibold ${teamB ? "text-ink/70" : "text-ink-2"}`}>
              {Math.round(expected * 100)}%<span className="sr-only"> chance to win</span>
            </span>
          )}
        </p>
        {pl.flagged && (
          <span className="mt-1 block">
            <FlagBadge compact />
          </span>
        )}
      </div>
    </li>
  );
}

function OpenSpot({ side, onJoin, beach }: { side: Side; onJoin?: (side: Side) => void; beach: boolean }) {
  const base = `relative flex min-h-[64px] items-center justify-center rounded-xl border-2 border-dashed text-[0.88rem] font-medium ${
    beach ? "border-court/35 bg-sand text-court-deep/70" : "border-white/35 bg-court-floor text-white/70"
  }`;
  if (!onJoin) return <li className={base}>Open spot</li>;
  return (
    <li className="contents">
      <button
        onClick={() => onJoin(side)}
        className={`${base} transition-colors ${beach ? "hover:border-court hover:bg-white/40 hover:text-court-deep" : "hover:border-white hover:bg-white/10 hover:text-white"}`}
      >
        Join Team {side}
      </button>
    </li>
  );
}

function Half({
  side,
  ids,
  size,
  beach,
  props,
}: {
  side: Side;
  ids: string[];
  size: number;
  beach: boolean;
  props: CourtProps;
}) {
  const arrivedOrder = ids.filter((id) => props.arrived.has(id));
  const spots = Array.from({ length: Math.max(0, size - ids.length) });
  return (
    <ul
      aria-label={`Team ${side}, ${ids.length} of ${size} players`}
      className={`grid content-center gap-2 p-3 sm:gap-2.5 sm:p-4 ${beach ? "grid-cols-[repeat(2,minmax(0,1fr))] md:grid-cols-1" : "grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-[repeat(3,minmax(0,1fr))] md:grid-cols-[repeat(2,minmax(0,1fr))]"}`}
    >
      {ids.map((id) => (
        <PlayerChip
          key={id}
          id={id}
          side={side}
          rating={props.ratingOf(id)}
          expected={props.expected?.get(id)}
          arrivedIndex={props.arrived.has(id) ? arrivedOrder.indexOf(id) : null}
        />
      ))}
      {spots.map((_, i) => (
        <OpenSpot key={`open-${i}`} side={side} beach={beach} onJoin={props.canJoin(side) ? props.onJoin : undefined} />
      ))}
    </ul>
  );
}

/**
 * Top-down court. Desktop: Team A left, Team B right, net down the middle.
 * Phones: Team A on top, net across, Team B below.
 */
export function Court(props: CourtProps) {
  const beach = props.format === "beach";
  const size = beach ? 2 : 6;

  return (
    <div
      className={`rounded-[18px] p-3 sm:p-5 ${beach ? "bg-[#dcc48e]" : "bg-court-zone"}`}
      role="group"
      aria-label={`${beach ? "Beach" : "Indoor"} court`}
    >
      <div
        className={`relative grid grid-cols-[minmax(0,1fr)] grid-rows-[1fr_auto_1fr] border-[3px] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-rows-1 ${
          beach ? "border-court bg-sand" : "border-white bg-court-floor"
        }`}
      >
        {/* attack lines (indoor only), 3m from the net */}
        {!beach && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[30%] h-px bg-white/45 md:inset-x-auto md:inset-y-0 md:left-[32%] md:top-0 md:h-auto md:w-px" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[30%] h-px bg-white/45 md:inset-x-auto md:inset-y-0 md:bottom-0 md:right-[32%] md:h-auto md:w-px" />
          </>
        )}

        <Half side="A" ids={props.teamA} size={size} beach={beach} props={props} />

        {/* the net */}
        <div aria-hidden="true" className="relative flex items-center justify-center md:w-3">
          <div className={`h-3 w-[calc(100%+24px)] -mx-3 md:mx-0 md:h-[calc(100%+24px)] md:w-3 ${beach ? "bg-ink" : "bg-ink"}`}>
            <div className="h-1 w-full bg-white md:h-full md:w-1" />
          </div>
        </div>

        <Half side="B" ids={props.teamB} size={size} beach={beach} props={props} />
      </div>
    </div>
  );
}
