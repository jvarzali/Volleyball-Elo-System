"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Lock, MapPin } from "lucide-react";
import { ROTATION_LABELS, type Rotation } from "@/lib/court";
import { games, locations, type Format } from "@/lib/data";
import { FormatTag } from "@/components/ui";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const randomCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

const ROTATION_ORDER: Rotation[] = ["cap_2", "cap_3", "no_limit", "rotation"];

const fieldLabel = "block text-[0.95rem] font-semibold text-ink";
const helper = "mt-1 text-[0.88rem] text-ink-2";
const input =
  "mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-[1rem] outline-none transition-colors focus:border-court";

export default function NewGamePage() {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations[0].id);
  const [court, setCourt] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [time, setTime] = useState("");
  const [format, setFormat] = useState<Format>(locations[0].format);
  const [rotation, setRotation] = useState<Rotation>("cap_2");
  const [skill, setSkill] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loc = locations.find((l) => l.id === locationId)!;
  const presetCourts = Array.from({ length: loc.courts }, (_, i) => String(i + 1));

  // PLAN §4.2: creating a game on a court that's already running offers its queue instead.
  const busy = useMemo(
    () => games.find((g) => g.locationId === locationId && g.court === court.trim() && g.status === "live"),
    [locationId, court],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (when === "later" && !time) next.time = "Pick a start time, or choose Now.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    const start =
      when === "now"
        ? "Starting now"
        : new Date(time).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
    const params = new URLSearchParams({ loc: locationId, court: court.trim() || "1", format, rotation, start });
    if (skill.trim()) params.set("skill", skill.trim());
    router.push(`/g/${randomCode()}?${params}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-[3.2rem] font-black sm:text-[4rem]">New game</h1>
      <p className="mt-2 max-w-lg text-[1.05rem] text-ink-2">
        Pick a court and a time. Players nearby will see it and can join a team or the queue.
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-9">
        {/* Where */}
        <fieldset>
          <legend className={fieldLabel}>Location</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup">
            {locations.map((l) => (
              <label
                key={l.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-surface px-4 py-3 transition-colors ${
                  locationId === l.id ? "border-ink" : "border-line hover:border-ink-3"
                }`}
              >
                <input
                  type="radio"
                  name="location"
                  checked={locationId === l.id}
                  onChange={() => {
                    setLocationId(l.id);
                    setFormat(l.format);
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--color-ink)]"
                />
                <span className="min-w-0">
                  <span className="block font-semibold">{l.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.85rem] text-ink-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} aria-hidden="true" />
                      {l.area}
                    </span>
                    <FormatTag format={l.format} />
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className={helper}>{loc.notes}</p>
        </fieldset>

        <div>
          <label htmlFor="court" className={fieldLabel}>
            Court number <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <p className={helper}>{loc.name} has {loc.courts} {loc.courts === 1 ? "court" : "courts"}.</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Court number">
            {presetCourts.map((c) => (
              <button
                type="button"
                key={c}
                aria-pressed={court === c}
                onClick={() => setCourt(court === c ? "" : c)}
                className={`display num grid h-12 w-12 place-items-center rounded-[var(--radius-control)] border-2 text-[1.5rem] font-bold ${
                  court === c ? "border-court bg-court text-white" : "border-line bg-surface text-ink hover:border-ink-3"
                }`}
              >
                {c}
              </button>
            ))}
            <input
              id="court"
              value={presetCourts.includes(court) ? "" : court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder="Other"
              className="min-h-12 w-28 rounded-[var(--radius-control)] border-2 border-line bg-surface px-3 outline-none focus:border-court"
            />
          </div>
          {busy && (
            <div role="status" className="mt-3 rounded-xl bg-ball-tint px-4 py-3 text-[0.92rem]">
              <p className="font-semibold">Court {busy.court} already has a game going.</p>
              <p className="mt-0.5 text-ink-2">You can join its queue instead of starting a second game on the same court.</p>
              <button type="button" onClick={() => router.push(`/g/${busy.code}`)} className="mt-2 font-semibold text-court underline underline-offset-2">
                Go to Court {busy.court}
              </button>
            </div>
          )}
        </div>

        {/* When */}
        <fieldset>
          <legend className={fieldLabel}>Start time</legend>
          <div className="mt-3 inline-flex rounded-full bg-line-2 p-1" role="radiogroup">
            {(["now", "later"] as const).map((w) => (
              <button
                type="button"
                role="radio"
                aria-checked={when === w}
                key={w}
                onClick={() => setWhen(w)}
                className={`min-h-10 rounded-full px-5 text-[0.95rem] font-medium ${when === w ? "bg-surface text-ink shadow-[0_1px_2px_rgb(18_32_58/0.12)]" : "text-ink-2"}`}
              >
                {w === "now" ? "Now" : "Pick a time"}
              </button>
            ))}
          </div>
          {when === "later" && (
            <div className="mt-3">
              <label htmlFor="time" className="sr-only">
                Start time
              </label>
              <input
                id="time"
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-invalid={!!errors.time}
                aria-describedby={errors.time ? "time-error" : undefined}
                className={`${input} max-w-xs ${errors.time ? "border-down" : ""}`}
              />
              {errors.time && (
                <p id="time-error" className="mt-1.5 text-[0.88rem] font-medium text-down">
                  {errors.time}
                </p>
              )}
            </div>
          )}
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-[0.95rem]">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" />
            Repeat weekly for 4 weeks
          </label>
        </fieldset>

        {/* How */}
        <fieldset>
          <legend className={fieldLabel}>Format</legend>
          <div className="mt-3 inline-flex rounded-full bg-line-2 p-1" role="radiogroup">
            {(["indoor", "beach"] as const).map((f) => (
              <button
                type="button"
                role="radio"
                aria-checked={format === f}
                key={f}
                onClick={() => setFormat(f)}
                className={`min-h-10 rounded-full px-5 text-[0.95rem] font-medium ${format === f ? "bg-surface text-ink shadow-[0_1px_2px_rgb(18_32_58/0.12)]" : "text-ink-2"}`}
              >
                {f === "indoor" ? "Indoor, 6 a side" : "Beach, 2 a side"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={fieldLabel}>How the court rotates</legend>
          <p className={helper}>Decides who stays on after each game. Applies to every game on this court tonight.</p>
          <div className="mt-3 space-y-2" role="radiogroup">
            {ROTATION_ORDER.map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-surface px-4 py-3 transition-colors ${
                  rotation === r ? "border-ink" : "border-line hover:border-ink-3"
                }`}
              >
                <input type="radio" name="rotation" checked={rotation === r} onChange={() => setRotation(r)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                <span>
                  <span className="font-semibold">
                    {ROTATION_LABELS[r].name}
                    {r === "cap_2" && <span className="ml-2 text-[0.85rem] font-medium text-ink-3">Default</span>}
                  </span>
                  <span className="block text-[0.9rem] text-ink-2">{ROTATION_LABELS[r].detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="skill" className={fieldLabel}>
            Skill level <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input id="skill" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="For example, Intermediate+" className={input} />
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="flex items-start gap-3 text-[0.92rem] text-ink-2">
            <Lock size={18} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
            <span>
              <span className="font-semibold text-ink">Nobody can edit a game once it&rsquo;s created, including you.</span> If plans change, leave it and
              create a new one. You&rsquo;ll be the first player on Team A, with no more say than anyone else who joins.
            </span>
          </p>
          <button type="submit" className="mt-4 min-h-12 w-full rounded-[var(--radius-control)] bg-court font-semibold text-white">
            Create game
          </button>
        </div>
      </form>
    </div>
  );
}
