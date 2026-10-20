"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CirclePlay, Info, MapPin, QrCode, UserPlus } from "lucide-react";
import {
  FILL_WINDOW_SECONDS,
  ROTATION_LABELS,
  firstGameState,
  nextOnCourt,
  pickNext,
  teamSizeFor,
  type CourtState,
  type GameResult,
} from "@/lib/court";
import { previewExpectations, rateGame, type GameRating, type RosterPlayer, type Side } from "@/lib/elo";
import type { Vote } from "@/lib/honesty";
import {
  ME,
  commentsByGame,
  displayName,
  formatCode,
  getPlayer,
  locationById,
  myFriends,
  players,
  type Game,
  type QueueEntry,
} from "@/lib/data";
import { Avatar, FormatTag } from "../ui";
import { Court } from "./Court";
import { QueuePanel } from "./QueuePanel";
import { ResultPanel, type LastGame } from "./ResultPanel";
import { Sheet } from "./Sheet";
import { ShareSheet } from "./ShareSheet";

type Phase = "open" | "live" | "filling";

const RESULT_OPTIONS: Array<{ value: GameResult; label: string; hint: string }> = [
  { value: "A", label: "Team A won", hint: "Ratings move based on how expected the win was." },
  { value: "B", label: "Team B won", hint: "Ratings move based on how expected the win was." },
  { value: "tie", label: "Tie", hint: "The lower-rated side gains a little. Challengers stay on." },
  { value: "dnf", label: "Didn't finish", hint: "Nobody's rating changes. Both teams come off." },
];

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
}

export function GameRoom({ game }: { game: Game }) {
  const loc = locationById.get(game.locationId)!;
  const format = game.format;
  const teamSize = teamSizeFor(format);
  const rotation = ROTATION_LABELS[game.rotation];

  const [phase, setPhase] = useState<Phase>(game.status);
  const [teamA, setTeamA] = useState<string[]>(game.teamA);
  const [teamB, setTeamB] = useState<string[]>(game.teamB);
  const [queue, setQueue] = useState<QueueEntry[]>(game.queue);
  const [gameNumber, setGameNumber] = useState(game.gameNumber);
  const [court, setCourt] = useState<CourtState>(() =>
    game.holderStreak ? { holder: "A", holderWinStreak: game.holderStreak, holderGamesInRow: game.holderStreak, challengerGamesInRow: 0 } : firstGameState(),
  );
  const [arrived, setArrived] = useState<Set<string>>(new Set());
  const [fillEndsAt, setFillEndsAt] = useState<number | null>(null);
  const [pendingSlots, setPendingSlots] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("");
  const [endOpen, setEndOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [choice, setChoice] = useState<GameResult>("A");
  const [score, setScore] = useState("");
  const [last, setLast] = useState<LastGame | null>(() => seedLastGame(game));

  const ratingOf = useCallback((id: string) => getPlayer(id)?.[format].rating ?? 1500, [format]);
  const roster = useCallback(
    (ids: string[]): RosterPlayer[] => ids.map((id) => ({ id, rating: ratingOf(id), gamesPlayed: getPlayer(id)?.[format].games })),
    [format, ratingOf],
  );

  const inA = teamA.includes(ME);
  const inB = teamB.includes(ME);
  const onTeam = inA || inB;
  const myEntry = queue.find((e) => e.members.includes(ME)) ?? null;
  const lockedOnCourt = onTeam && phase === "live";

  const expectations = useMemo(() => {
    if (teamA.length === 0 || teamB.length === 0) return null;
    return previewExpectations(roster(teamA), roster(teamB));
  }, [teamA, teamB, roster]);

  // ── announcements + entrance animation ────────────────────────────
  const say = (msg: string) => setAnnouncement(msg);
  const markArrived = (ids: string[]) => {
    setArrived(new Set(ids));
    setTimeout(() => setArrived(new Set()), 1200);
  };

  // ── membership (PLAN §4.3: one active spot per player) ───────────
  function removeMeEverywhere() {
    setTeamA((t) => t.filter((id) => id !== ME));
    setTeamB((t) => t.filter((id) => id !== ME));
    setQueue((q) => q.map((e) => ({ ...e, members: e.members.filter((id) => id !== ME) })).filter((e) => e.members.length > 0));
  }

  function joinTeam(side: Side) {
    if (phase !== "open" || lockedOnCourt) return;
    const team = side === "A" ? teamA : teamB;
    if (team.length >= teamSize) return;
    removeMeEverywhere();
    (side === "A" ? setTeamA : setTeamB)((t) => [...t.filter((id) => id !== ME), ME]);
    markArrived([ME]);
    say(`You joined Team ${side}.`);
  }

  function leaveTeam() {
    if (phase !== "open") return;
    removeMeEverywhere();
    say("You left the team.");
  }

  function startEntry() {
    if (lockedOnCourt) return;
    removeMeEverywhere();
    const me = getPlayer(ME)!;
    setQueue((q) => [...q, { id: `me-${Date.now()}`, name: `${displayName(me)}'s team`, members: [ME], queuedAt: nowLabel() }]);
    say("You started a team in the queue.");
  }

  function joinEntry(id: string) {
    if (lockedOnCourt) return;
    removeMeEverywhere();
    setQueue((q) => q.map((e) => (e.id === id && e.members.length < teamSize ? { ...e, members: [...e.members, ME] } : e)));
    const entry = queue.find((e) => e.id === id);
    say(`You joined ${entry?.name ?? "a team"} in the queue.`);
  }

  function leaveQueue() {
    setQueue((q) => q.map((e) => ({ ...e, members: e.members.filter((x) => x !== ME) })).filter((e) => e.members.length > 0));
    say("You left the queue.");
  }

  // ── friend authority (PLAN §4.6) ──────────────────────────────────
  const friendsHere = new Set([...teamA, ...teamB, ...queue.flatMap((e) => e.members)]);
  function addFriend(id: string, direct: boolean) {
    if (!direct) {
      setInvited((s) => new Set(s).add(id));
      say(`Invite sent to ${getPlayer(id)?.name}.`);
      return;
    }
    if (onTeam && phase === "open") {
      const side: Side = inA ? "A" : "B";
      const team = side === "A" ? teamA : teamB;
      if (team.length < teamSize) {
        (side === "A" ? setTeamA : setTeamB)((t) => [...t, id]);
        markArrived([id]);
        say(`${getPlayer(id)?.name} added to Team ${side}. They've been notified.`);
        return;
      }
    }
    if (myEntry && myEntry.members.length < teamSize) {
      setQueue((q) => q.map((e) => (e.id === myEntry.id ? { ...e, members: [...e.members, id] } : e)));
      say(`${getPlayer(id)?.name} added to ${myEntry.name}. They've been notified.`);
    }
  }
  const canAddFriends = (onTeam && phase === "open") || myEntry !== null;

  // ── start / end ───────────────────────────────────────────────────
  function startGame() {
    if (!onTeam || teamA.length === 0 || teamB.length === 0) return;
    setPhase("live");
    say(`Game ${gameNumber} started. Teams are locked until it ends.`);
  }

  function endGame() {
    const result = choice;
    const rating: GameRating | null = result === "dnf" ? null : rateGame(roster(teamA), roster(teamB), result);
    const next = nextOnCourt(game.rotation, court, result);

    setLast({
      gameNumber,
      result,
      score: score.trim() || undefined,
      teamA,
      teamB,
      rating,
      endedBy: ME,
      votes: [{ userId: ME, vote: "confirm" }],
    });

    const stayers = next.stays === "A" ? teamA : next.stays === "B" ? teamB : [];
    const newA = next.stays === "A" ? stayers : [];
    const newB = next.stays === "B" ? stayers : [];
    setCourt(next.stays && next.carry ? { holder: next.stays, holderWinStreak: next.carry.winStreak, holderGamesInRow: next.carry.gamesInRow, challengerGamesInRow: 0 } : firstGameState());

    setEndOpen(false);
    setScore("");
    callFromQueue(newA, newB, queue, next.openSlots, false);
  }

  /** Fill the open side(s) from the queue (PLAN §4.9). */
  function callFromQueue(a: string[], b: string[], q: QueueEntry[], slots: number, windowExpired: boolean) {
    const sized = q.map((e) => ({ ...e, size: e.members.length }));
    const pick = pickNext(sized, slots, teamSize, windowExpired);
    let nextA = a;
    let nextB = b;
    const placed: string[] = [];
    for (const entry of pick.called) {
      if (nextA.length === 0) nextA = entry.members;
      else nextB = entry.members;
      placed.push(...entry.members);
    }
    setTeamA(nextA);
    setTeamB(nextB);
    setQueue(pick.queue.map(({ size: _size, ...e }) => e));
    markArrived(placed);

    if (pick.waitingForFill) {
      setPendingSlots(slots - pick.called.length);
      setFillEndsAt(Date.now() + FILL_WINDOW_SECONDS * 1000);
      setNow(Date.now());
      setPhase("filling");
      say(`${pick.queue[0].name} has 3 minutes to fill their team.`);
    } else {
      setFillEndsAt(null);
      setPendingSlots(0);
      setPhase("open");
      setGameNumber((n) => n + 1);
      say(pick.called.length ? `${pick.called.map((e) => e.name).join(" and ")} ${pick.called.length > 1 ? "are" : "is"} up.` : "The court is open. Anyone can join the open side.");
    }
  }

  // fill window clock
  useEffect(() => {
    if (phase !== "filling") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const fillSecondsLeft = phase === "filling" && fillEndsAt ? Math.max(0, Math.ceil((fillEndsAt - now) / 1000)) : null;

  // window closed, or the front entry filled early
  useEffect(() => {
    if (phase !== "filling") return;
    const front = queue[0];
    const frontFull = front && front.members.length >= teamSize;
    if (fillSecondsLeft === 0 || frontFull) {
      callFromQueue(teamA, teamB, queue, pendingSlots, fillSecondsLeft === 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillSecondsLeft, queue, phase]);

  function requeueTogether(ids: string[], name: string) {
    const free = ids.filter((id) => !teamA.includes(id) && !teamB.includes(id) && !queue.some((e) => e.members.includes(id)));
    if (free.length === 0) return;
    setQueue((q) => [...q, { id: `rq-${Date.now()}`, name, members: free, queuedAt: nowLabel() }]);
    say(`${name} is back in line.`);
  }

  function vote(v: Vote) {
    setLast((l) => (l ? { ...l, votes: [...l.votes.filter((x) => x.userId !== ME), { userId: ME, vote: v }] } : l));
  }

  // ── derived UI state ──────────────────────────────────────────────
  const canJoin = (side: Side) =>
    phase === "open" && !lockedOnCourt && !(side === "A" ? inA : inB) && (side === "A" ? teamA : teamB).length < teamSize;
  const canStart = phase === "open" && onTeam && teamA.length > 0 && teamB.length > 0;
  const holderSide: Side = court.holder;
  const streak = court.holderWinStreak;
  const comments = commentsByGame[game.code] ?? [];

  const statusLabel =
    phase === "live" ? `Game ${gameNumber} in progress` : phase === "filling" ? "Waiting for the next team" : gameNumber > 1 ? `Game ${gameNumber} forming` : game.start;

  return (
    <div>
      <Link href="/" className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-[0.95rem] font-medium text-ink-2 hover:text-ink">
        <ArrowLeft size={18} aria-hidden="true" />
        All games
      </Link>

      {/* ── header ───────────────────────────────────────────── */}
      <header className="mb-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex items-end gap-5">
          <div className="text-center">
            <span className="block text-[0.85rem] font-medium text-ink-2">Court</span>
            <span className="display num block text-[5.5rem] font-black leading-[0.8] text-court sm:text-[7rem]">{game.court}</span>
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="display text-[2.4rem] font-extrabold text-ink sm:text-[3rem]">{loc.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.95rem] text-ink-2">
              <span className="inline-flex items-center gap-1">
                <MapPin size={15} aria-hidden="true" />
                {loc.area}
              </span>
              <FormatTag format={format} />
              {game.skill && <span>{game.skill}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.92rem] font-semibold ${
              phase === "live" ? "bg-ink text-white" : phase === "filling" ? "bg-ball text-ink" : "bg-surface text-ink ring-1 ring-line"
            }`}
          >
            {phase === "live" && <span className="h-2 w-2 rounded-full bg-[#36d27a]" aria-hidden="true" />}
            {statusLabel}
          </span>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-[0.92rem] font-semibold text-ink ring-1 ring-line hover:ring-ink"
          >
            <QrCode size={18} aria-hidden="true" />
            <span className="display num text-[1.2rem] font-bold tracking-wide">{formatCode(game.code)}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {last && (
            <ResultPanel
              last={last}
              format={format}
              onVote={vote}
              onRequeue={requeueTogether}
              stillOnCourt={(id) => teamA.includes(id) || teamB.includes(id)}
              inQueue={(id) => queue.some((e) => e.members.includes(id))}
            />
          )}

          {/* ── team bar ─────────────────────────────────────── */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <TeamLabel side="A" ids={teamA} roster={roster} holder={holderSide === "A" && gameNumber > 1} streak={streak} />
            <span className="pb-1 text-[0.85rem] font-medium text-ink-3">vs</span>
            <TeamLabel side="B" ids={teamB} roster={roster} holder={holderSide === "B" && gameNumber > 1} streak={streak} alignRight />
          </div>
          {expectations && expectations.teamA !== null && (
            <div>
              <div className="flex h-2.5 overflow-hidden rounded-full" role="img" aria-label={`Team A has a ${Math.round(expectations.teamA * 100)}% chance to win`}>
                <span className="bg-court transition-[width] duration-500" style={{ width: `${expectations.teamA * 100}%` }} />
                <span className="flex-1 bg-ball" />
              </div>
              <p className="num mt-1.5 flex justify-between text-[0.85rem] text-ink-2">
                <span>{Math.round(expectations.teamA * 100)}% to win</span>
                <span>{Math.round((1 - expectations.teamA) * 100)}% to win</span>
              </p>
            </div>
          )}

          <Court
            format={format}
            teamA={teamA}
            teamB={teamB}
            ratingOf={ratingOf}
            expected={phase === "live" ? expectations?.players : undefined}
            arrived={arrived}
            canJoin={canJoin}
            onJoin={joinTeam}
          />

          {/* ── actions ──────────────────────────────────────── */}
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4 sm:p-5">
            {phase === "live" ? (
              onTeam ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-[0.95rem] text-ink-2">
                    Teams are locked until the game ends. When it&rsquo;s over, anyone on court can end it and record the result.
                  </p>
                  <button onClick={() => setEndOpen(true)} className="min-h-12 shrink-0 rounded-[var(--radius-control)] bg-ink px-6 font-semibold text-white">
                    End game
                  </button>
                </div>
              ) : (
                <p className="text-[0.95rem] text-ink-2">
                  Game {gameNumber} is being played. Teams are locked, but the queue is open. Get in line to play the winners.
                </p>
              )
            ) : phase === "filling" ? (
              <p className="text-[0.95rem] text-ink-2">
                The next team gets up to 3 minutes to fill. You can still join them in the queue.
                <button
                  onClick={() => setFillEndsAt(Date.now())}
                  className="ml-2 font-semibold text-court underline underline-offset-2"
                >
                  Skip the wait (demo)
                </button>
              </p>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-[0.95rem] text-ink-2">
                  {onTeam
                    ? teamA.length && teamB.length
                      ? "Anyone on a team can start the game. After that, nobody can switch or leave until it ends."
                      : "Waiting for players on the other side. Share the code to bring people in."
                    : "Pick an open spot to join a team, or get in line for the next game."}
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {onTeam && (
                    <button onClick={leaveTeam} className="min-h-12 rounded-[var(--radius-control)] px-4 font-medium text-ink-2 underline underline-offset-2">
                      Leave team
                    </button>
                  )}
                  <button
                    onClick={startGame}
                    disabled={!canStart}
                    className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] bg-court px-6 font-semibold text-white disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-3"
                  >
                    <CirclePlay size={20} aria-hidden="true" />
                    Start game
                  </button>
                </div>
              </div>
            )}
            {canAddFriends && (
              <button
                onClick={() => setFriendsOpen(true)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 border-t border-line-2 pt-4 text-[0.95rem] font-semibold text-court sm:w-full"
              >
                <UserPlus size={18} aria-hidden="true" />
                Add friends to {onTeam && phase === "open" ? `Team ${inA ? "A" : "B"}` : myEntry?.name}
              </button>
            )}
          </div>
        </div>

        {/* ── sidebar ──────────────────────────────────────────── */}
        <aside className="space-y-5">
          <QueuePanel
            queue={queue}
            teamSize={teamSize}
            canJoinQueue={!lockedOnCourt}
            myEntryId={myEntry?.id ?? null}
            fillSecondsLeft={fillSecondsLeft}
            onJoinEntry={joinEntry}
            onStartEntry={startEntry}
            onLeave={leaveQueue}
          />

          <section aria-labelledby="rules-title" className="rounded-[var(--radius-panel)] bg-court-tint p-5">
            <h2 id="rules-title" className="flex items-center gap-2 font-semibold text-court-deep">
              <Info size={18} aria-hidden="true" />
              How this court runs
            </h2>
            <dl className="mt-3 space-y-3 text-[0.92rem] text-ink-2">
              <div>
                <dt className="font-semibold text-ink">{rotation.name}</dt>
                <dd>{rotation.detail}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Ties</dt>
                <dd>The challengers stay on. A game that doesn&rsquo;t finish sends both teams off.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Results</dt>
                <dd>Whoever ends the game records the result. It stands unless someone disputes it within 24 hours.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Leaving between games</dt>
                <dd>If more than half of the winning team leaves, they give up the court. Otherwise they get 3 minutes to refill.</dd>
              </div>
            </dl>
            <p className="mt-4 text-[0.82rem] text-ink-3">Set when the game was created. Nobody can change these.</p>
          </section>

          <section aria-labelledby="chat-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <h2 id="chat-title" className="font-semibold text-ink">
              Court chat
            </h2>
            {comments.length ? (
              <ul className="mt-3 space-y-3">
                {comments.map((c, i) => {
                  const pl = getPlayer(c.by)!;
                  return (
                    <li key={i} className="flex gap-3">
                      <Avatar player={pl} size={30} />
                      <div className="min-w-0 text-[0.92rem]">
                        <p>
                          <span className="font-semibold">{displayName(pl)}</span> <span className="text-ink-3">{c.when}</span>
                        </p>
                        <p className="text-ink-2">{c.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[0.92rem] text-ink-3">No messages yet. Running late, or bringing a ball? Say so here.</p>
            )}
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="chat-input" className="sr-only">
                Message the court
              </label>
              <input
                id="chat-input"
                placeholder="Message the court"
                className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-paper px-3 text-[0.95rem] outline-none focus:border-court"
              />
              <button className="min-h-11 rounded-[var(--radius-control)] bg-ink px-4 text-[0.92rem] font-semibold text-white">Send</button>
            </form>
          </section>
        </aside>
      </div>

      {/* ── sheets ─────────────────────────────────────────────── */}
      <Sheet open={endOpen} onClose={() => setEndOpen(false)} title={`End game ${gameNumber}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            endGame();
          }}
        >
          <fieldset>
            <legend className="text-[0.95rem] text-ink-2">How did it end? You&rsquo;re the only one who needs to answer.</legend>
            <div className="mt-4 space-y-2">
              {RESULT_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                    choice === o.value ? "border-ink bg-paper" : "border-line hover:border-ink-3"
                  }`}
                >
                  <input type="radio" name="result" value={o.value} checked={choice === o.value} onChange={() => setChoice(o.value)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                  <span>
                    <span className="flex items-center gap-2 font-semibold">
                      {(o.value === "A" || o.value === "B") && (
                        <span className={`h-3 w-3 rounded-full ${o.value === "A" ? "bg-court" : "bg-ball ring-1 ring-ink/30"}`} aria-hidden="true" />
                      )}
                      {o.label}
                    </span>
                    <span className="block text-[0.88rem] text-ink-2">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {choice !== "dnf" && (
            <div className="mt-4">
              <label htmlFor="score" className="text-[0.92rem] font-medium">
                Score <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <input
                id="score"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="25–21"
                className="mt-1.5 min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-paper px-3 outline-none focus:border-court"
              />
            </div>
          )}
          <p className="mt-4 text-[0.85rem] text-ink-3">Everyone who played gets notified and has 24 hours to dispute it.</p>
          <button type="submit" className="mt-4 min-h-12 w-full rounded-[var(--radius-control)] bg-ink font-semibold text-white">
            End game and record result
          </button>
        </form>
      </Sheet>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} code={game.code} />

      <Sheet open={friendsOpen} onClose={() => setFriendsOpen(false)} title="Add friends">
        <p className="text-[0.95rem] text-ink-2">
          Friends who gave you authority are added straight away. Everyone else gets an invite they can accept or decline.
        </p>
        <ul className="mt-4 divide-y divide-line-2">
          {myFriends
            .filter((f) => !friendsHere.has(f.id))
            .map((f) => {
              const pl = getPlayer(f.id)!;
              const sent = invited.has(f.id);
              return (
                <li key={f.id} className="flex items-center gap-3 py-3">
                  <Avatar player={pl} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{pl.name}</p>
                    <p className="num text-[0.85rem] text-ink-2">
                      {Math.round(pl[format].rating)} {format}
                      <span className="mx-1.5 text-line" aria-hidden="true">/</span>
                      {f.grantsMeAuthority ? "Can add directly" : "Needs an invite"}
                    </p>
                  </div>
                  <button
                    disabled={sent}
                    onClick={() => addFriend(f.id, f.grantsMeAuthority)}
                    className={`min-h-10 rounded-[var(--radius-control)] px-4 text-[0.9rem] font-semibold ${
                      f.grantsMeAuthority ? "bg-court text-white" : "border-2 border-ink text-ink"
                    } disabled:border-line disabled:bg-transparent disabled:text-ink-3`}
                  >
                    {sent ? "Invited" : f.grantsMeAuthority ? "Add" : "Invite"}
                  </button>
                </li>
              );
            })}
        </ul>
      </Sheet>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function TeamLabel({
  side,
  ids,
  roster,
  holder,
  streak,
  alignRight,
}: {
  side: Side;
  ids: string[];
  roster: (ids: string[]) => RosterPlayer[];
  holder: boolean;
  streak: number;
  alignRight?: boolean;
}) {
  const rated = roster(ids);
  const avg = rated.length ? Math.round(rated.reduce((s, p) => s + (p.rating ?? 0), 0) / rated.length) : null;
  return (
    <div className={alignRight ? "text-right" : ""}>
      <p className={`flex items-center gap-2 font-semibold text-ink ${alignRight ? "justify-end" : ""}`}>
        <span className={`h-3.5 w-3.5 rounded-[4px] ${side === "A" ? "bg-court" : "bg-ball ring-1 ring-ink/25"}`} aria-hidden="true" />
        Team {side}
      </p>
      <p className="mt-0.5 text-[0.85rem] text-ink-2">
        {avg !== null ? (
          <>
            <span className="display num text-[1.35rem] font-bold text-ink">{avg}</span> avg
          </>
        ) : (
          "No players yet"
        )}
        {holder && streak > 0 && (
          <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[0.75rem] font-semibold text-white">
            {streak} {streak === 1 ? "win" : "wins"} in a row
          </span>
        )}
      </p>
    </div>
  );
}

/** For the live sample game, show the previous game's result so disputes can be tried. */
function seedLastGame(game: Game): LastGame | null {
  if (game.status !== "live" || game.gameNumber < 2) return null;
  const prevA = game.teamA;
  // The team that lost game 2 requeued, so the previous opponents come from players off the court.
  const busy = new Set([...game.teamA, ...game.teamB]);
  const prevB = players.filter((pl) => !busy.has(pl.id) && pl.id !== ME).slice(0, teamSizeFor(game.format)).map((pl) => pl.id);
  const toRoster = (ids: string[]) => ids.map((id) => ({ id, rating: getPlayer(id)?.[game.format].rating ?? 1500, gamesPlayed: getPlayer(id)?.[game.format].games }));
  return {
    gameNumber: game.gameNumber - 1,
    result: "A",
    score: game.format === "beach" ? "21–17" : "25–21",
    teamA: prevA,
    teamB: prevB,
    rating: rateGame(toRoster(prevA), toRoster(prevB), "A"),
    endedBy: game.teamA[1] ?? game.teamA[0],
    votes: [{ userId: game.teamA[1] ?? game.teamA[0], vote: "confirm" }],
  };
}

