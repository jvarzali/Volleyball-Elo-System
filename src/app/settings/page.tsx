"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";
import { LIFETIME_THRESHOLD, RECENT_THRESHOLD, STARTING_STRIKES, flagStatus } from "@/lib/honesty";
import { ME, getPlayer, myFriends } from "@/lib/data";
import { Avatar } from "@/components/ui";

type Policy = "nobody" | "all_friends" | "selected";

const POLICIES: Array<{ value: Policy; title: string; body: string }> = [
  {
    value: "nobody",
    title: "Nobody, always ask me",
    body: "Friends can only invite you. You accept or decline, and nobody else can move or remove you.",
  },
  {
    value: "all_friends",
    title: "All my friends",
    body: "Any friend can add you to a game or the queue, switch your team, or remove you before a game starts.",
  },
  {
    value: "selected",
    title: "Selected friends",
    body: "Only the friends you pick can add, move, or remove you. Everyone else sends an invite.",
  },
];

// The signed-in player's private record: points per ended game, oldest first.
// Both strikes were used early on, so the split (0.25) and the lost dispute (1) counted.
const HISTORY = [...Array(40).fill(0), 0.25, ...Array(15).fill(0), 1, 0, 0, 0];
const STRIKES_LEFT = 0;

function Meter({ label, value, threshold, note }: { label: string; value: number; threshold: number; note: string }) {
  const max = threshold * 2;
  const pct = Math.min(100, (value / max) * 100);
  const over = value > threshold;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <p className="num text-[0.95rem]">
          <span className={`font-bold ${over ? "text-flag" : "text-ink"}`}>{value.toFixed(3)}</span>
          <span className="text-ink-3"> / limit {threshold.toFixed(2)}</span>
        </p>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-line-2" role="img" aria-label={`${label}: ${value.toFixed(3)} of a ${threshold} limit`}>
        <span className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-flag" : "bg-court"}`} style={{ width: `${pct}%` }} />
        <span className="absolute -top-1 bottom-[-4px] w-0.5 bg-ink" style={{ left: "50%" }} aria-hidden="true" />
      </div>
      <p className="mt-1.5 text-[0.85rem] text-ink-2">{note}</p>
    </div>
  );
}

export default function SettingsPage() {
  const me = getPlayer(ME)!;
  const [policy, setPolicy] = useState<Policy>("selected");
  const [allowed, setAllowed] = useState<Set<string>>(new Set(myFriends.filter((f) => f.iGrantAuthority).map((f) => f.id)));
  const [saved, setSaved] = useState(false);
  const status = flagStatus(HISTORY);

  function toggle(id: string) {
    setAllowed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setSaved(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-[3.2rem] font-black sm:text-[4rem]">Settings</h1>

      {/* Profile */}
      <section aria-labelledby="profile-title" className="mt-8">
        <h2 id="profile-title" className="display text-[1.9rem] font-bold">
          Profile
        </h2>
        <div className="mt-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5">
          <div className="flex items-center gap-4">
            <Avatar player={me} size={64} />
            <button className="min-h-11 rounded-[var(--radius-control)] border-2 border-line px-4 text-[0.95rem] font-semibold">Change photo</button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["name", "Full name", me.name, ""],
              ["nickname", "Nickname", me.nickname ?? "", "Optional"],
              ["username", "Username", me.username, "Used in your profile link"],
              ["instagram", "Instagram", me.instagram ?? "", "Optional, without the @"],
            ].map(([id, label, value, hint]) => (
              <div key={id}>
                <label htmlFor={id} className="block text-[0.92rem] font-semibold">
                  {label}
                </label>
                <input
                  id={id}
                  defaultValue={value}
                  aria-describedby={hint ? `${id}-hint` : undefined}
                  className="mt-1.5 min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-paper px-3 outline-none focus:border-court"
                />
                {hint && (
                  <p id={`${id}-hint`} className="mt-1 text-[0.82rem] text-ink-3">
                    {hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Friend authority */}
      <section aria-labelledby="authority-title" className="mt-10">
        <h2 id="authority-title" className="display text-[1.9rem] font-bold">
          Who can add me to games
        </h2>
        <p className="mt-1 max-w-xl text-[0.95rem] text-ink-2">
          Friends with this permission can put you on a team or in the queue, switch your team, and take you out, no matter who added you. You&rsquo;re
          notified every time.
        </p>
        <div className="mt-4 space-y-2" role="radiogroup" aria-labelledby="authority-title">
          {POLICIES.map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-surface px-4 py-3.5 transition-colors ${
                policy === p.value ? "border-ink" : "border-line hover:border-ink-3"
              }`}
            >
              <input
                type="radio"
                name="policy"
                checked={policy === p.value}
                onChange={() => {
                  setPolicy(p.value);
                  setSaved(false);
                }}
                className="mt-1 h-4 w-4 accent-[var(--color-ink)]"
              />
              <span>
                <span className="font-semibold">
                  {p.title}
                  {p.value === "nobody" && <span className="ml-2 text-[0.85rem] font-medium text-ink-3">Default</span>}
                </span>
                <span className="block text-[0.9rem] text-ink-2">{p.body}</span>
              </span>
            </label>
          ))}
        </div>

        {policy === "selected" && (
          <fieldset className="mt-4 rounded-[var(--radius-panel)] border border-line bg-surface">
            <legend className="sr-only">Friends who can add you</legend>
            <ul className="divide-y divide-line-2">
              {myFriends.map((f) => {
                const pl = getPlayer(f.id)!;
                return (
                  <li key={f.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                      <Avatar player={pl} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{pl.name}</span>
                        <span className="text-[0.85rem] text-ink-3">@{pl.username}</span>
                      </span>
                      <input type="checkbox" checked={allowed.has(f.id)} onChange={() => toggle(f.id)} className="h-5 w-5 accent-[var(--color-court)]" />
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => setSaved(true)} className="min-h-12 rounded-[var(--radius-control)] bg-ink px-6 font-semibold text-white">
            Save changes
          </button>
          <span role="status" className="text-[0.92rem] font-medium text-up">
            {saved ? "Changes saved" : ""}
          </span>
        </div>
      </section>

      {/* Honesty record */}
      <section aria-labelledby="honesty-title" className="mt-12">
        <h2 id="honesty-title" className="display text-[1.9rem] font-bold">
          Your honesty record
        </h2>
        <p className="mt-1 inline-flex items-center gap-2 text-[0.92rem] text-ink-2">
          <EyeOff size={16} aria-hidden="true" />
          Only you can see these numbers.
        </p>

        <div className="mt-4 space-y-6 rounded-[var(--radius-panel)] border border-line bg-surface p-5">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">Strikes left</p>
              <p className="num text-[0.95rem]">
                <span className="font-bold">{STRIKES_LEFT}</span>
                <span className="text-ink-3"> of {STARTING_STRIKES}</span>
              </p>
            </div>
            <div className="mt-2 flex gap-1.5" role="img" aria-label={`${STRIKES_LEFT} of ${STARTING_STRIKES} strikes left`}>
              {[0, 1, 2, 3].map((half) => (
                <span key={half} className={`h-3 flex-1 ${half % 2 === 0 ? "rounded-l-full" : "mr-2 rounded-r-full"} ${half < STRIKES_LEFT * 2 ? "bg-ball" : "bg-line-2"}`} />
              ))}
            </div>
            <p className="mt-1.5 text-[0.85rem] text-ink-2">
              Every player starts with 2 strikes to learn how results work. A lost dispute uses a whole strike and a split vote uses half. You&rsquo;ve used both, so penalties now apply right away.
            </p>
          </div>

          <Meter
            label="Lifetime average"
            value={status.lifetime}
            threshold={LIFETIME_THRESHOLD}
            note={`Dishonesty points per game across all ${HISTORY.length} of your games.`}
          />
          <Meter
            label="Last 10 games"
            value={status.recent}
            threshold={RECENT_THRESHOLD}
            note="A lost dispute four games ago counts here until it falls out of the window."
          />

          <div className={`rounded-xl px-4 py-3 text-[0.92rem] ${status.flagged ? "bg-flag-tint text-flag" : "bg-up/10 text-up"}`}>
            <p className="font-semibold">{status.flagged ? "You're flagged" : "You're in good standing"}</p>
            <p className="mt-0.5 text-ink-2">
              {status.flagged
                ? "Your profile shows a flag and you can't confirm or dispute results. It clears on its own once both averages are back under their limits."
                : "If either average goes over its limit, your profile shows a flag and you can't confirm or dispute results until it drops back."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
