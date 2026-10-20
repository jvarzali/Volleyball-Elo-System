import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, MapPin, Settings, UserPlus } from "lucide-react";
import { PROVISIONAL_GAMES } from "@/lib/elo";
import { ME, getPlayer, myFriends, ratingHistory, recentGames, type Format, type Player } from "@/lib/data";
import { Avatar, Delta, FlagBadge, FormatTag } from "@/components/ui";

function Sparkline({ values, format }: { values: number[]; format: Format }) {
  const w = 240;
  const h = 56;
  const min = Math.min(...values) - 6;
  const max = Math.max(...values) + 6;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const stroke = format === "indoor" ? "var(--color-court)" : "var(--color-sand-deep)";
  const baseline = y(1500);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden="true">
      {baseline > 0 && baseline < h && <line x1="0" x2={w} y1={baseline} y2={baseline} stroke="var(--color-line)" strokeDasharray="3 4" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3.5" fill={stroke} />
    </svg>
  );
}

function RatingPanel({ player, format }: { player: Player; format: Format }) {
  const r = player[format];
  const provisional = r.games < PROVISIONAL_GAMES;
  const history = ratingHistory(player, format);
  const change = history[history.length - 1] - history[Math.max(0, history.length - 6)];
  return (
    <section
      aria-labelledby={`${format}-rating`}
      className={`rounded-[var(--radius-panel)] p-5 ${format === "indoor" ? "bg-surface ring-1 ring-line" : "bg-sand-tint ring-1 ring-[#e7d9b5]"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${format}-rating`}>
          <FormatTag format={format} />
        </h2>
        {provisional && (
          <span className="text-[0.82rem] font-medium text-ink-2" title={`Ratings settle after ${PROVISIONAL_GAMES} games`}>
            Provisional, {PROVISIONAL_GAMES - r.games} games to go
          </span>
        )}
      </div>
      <p className="display num mt-3 text-[4.5rem] font-black leading-[0.85] text-ink sm:text-[5.25rem]">{Math.round(r.rating)}</p>
      <p className="mt-2 text-[0.9rem] text-ink-2">
        {r.games > 0 ? (
          <>
            <Delta value={change} /> over the last 5 games
          </>
        ) : (
          "No rated games yet"
        )}
      </p>
      {r.games > 1 && (
        <div className="mt-3">
          <Sparkline values={history} format={format} />
        </div>
      )}
      <dl className="mt-4 grid grid-cols-3 border-t border-ink/10 pt-3 text-center">
        {[
          ["Wins", r.w],
          ["Ties", r.t],
          ["Losses", r.l],
        ].map(([label, n]) => (
          <div key={label}>
            <dt className="text-[0.8rem] text-ink-2">{label}</dt>
            <dd className="display num text-[1.6rem] font-bold">{n}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const player = getPlayer(username);
  if (!player) notFound();

  const me = player.id === ME;
  const friend = myFriends.find((f) => f.id === player.id);
  const games = recentGames[player.id] ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4 sm:gap-5">
          <Avatar player={player} size={88} />
          <div className="min-w-0">
            <h1 className="display text-[2.6rem] font-extrabold sm:text-[3.2rem]">{player.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.95rem] text-ink-2">
              <span>@{player.username}</span>
              {player.nickname && <span>Goes by {player.nickname}</span>}
              {player.home && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} aria-hidden="true" />
                  {player.home}
                </span>
              )}
            </p>
            {player.flagged && (
              <p className="mt-2">
                <FlagBadge />
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {me ? (
            <Link href="/settings" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border-2 border-ink px-4 font-semibold">
              <Settings size={18} aria-hidden="true" />
              Edit profile
            </Link>
          ) : friend ? (
            <span className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-line-2 px-4 text-[0.95rem] font-medium text-ink-2">Friends</span>
          ) : (
            <button className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-ink px-4 font-semibold text-white">
              <UserPlus size={18} aria-hidden="true" />
              Add friend
            </button>
          )}
        </div>
      </header>

      {(player.positions || player.instagram || player.tiktok) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.92rem]">
          {player.positions?.map((pos) => (
            <span key={pos} className="rounded-full bg-surface px-3 py-1 font-medium ring-1 ring-line">
              {pos}
            </span>
          ))}
          {player.instagram && (
            <a
              href={`https://instagram.com/${player.instagram}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-medium text-court hover:bg-court-tint"
              rel="noopener noreferrer"
              target="_blank"
            >
              <AtSign size={15} aria-hidden="true" />
              {player.instagram} on Instagram
            </a>
          )}
          {player.tiktok && (
            <a
              href={`https://tiktok.com/@${player.tiktok}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-medium text-court hover:bg-court-tint"
              rel="noopener noreferrer"
              target="_blank"
            >
              <AtSign size={15} aria-hidden="true" />
              {player.tiktok} on TikTok
            </a>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <RatingPanel player={player} format="indoor" />
        <RatingPanel player={player} format="beach" />
      </div>

      <section aria-labelledby="recent" className="mt-10">
        <h2 id="recent" className="display mb-3 text-[1.9rem] font-bold">
          Recent games
        </h2>
        {games.length ? (
          <ul className="divide-y divide-line-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
            {games.map((g, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3.5">
                <span
                  className={`display grid h-11 w-11 place-items-center rounded-lg text-[1.3rem] font-bold ${
                    g.result === "W"
                      ? "bg-up/10 text-up"
                      : g.result === "L"
                        ? "bg-down/10 text-down"
                        : "bg-line-2 text-ink-2"
                  }`}
                  aria-label={{ W: "Win", L: "Loss", T: "Tie", DNF: "Didn't finish" }[g.result]}
                >
                  {g.result === "DNF" ? "–" : g.result}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.where}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[0.85rem] text-ink-2">
                    <span>{g.when}</span>
                    <FormatTag format={g.format} />
                    {g.score && <span className="num">{g.score}</span>}
                  </p>
                </div>
                <Delta value={g.delta} className="text-[1rem]" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[var(--radius-panel)] border border-dashed border-line px-5 py-6 text-ink-2">
            {me ? "Your games will show up here once you play." : `${player.name.split(" ")[0]} hasn't played a game here yet.`}
          </p>
        )}
      </section>
    </div>
  );
}
