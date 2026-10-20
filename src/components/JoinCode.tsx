"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function JoinCode() {
  const router = useRouter();
  const [chars, setChars] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const code = chars.join("");

  function setAt(i: number, raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) {
      setChars((c) => c.map((v, j) => (j === i ? "" : v)));
      return;
    }
    // Support pasting a whole code into any box.
    const next = [...chars];
    let j = i;
    for (const ch of clean) {
      if (j > 5) break;
      next[j] = ch;
      j++;
    }
    setChars(next);
    setError(null);
    refs.current[Math.min(j, 5)]?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      setError("Codes are 6 characters. Check the code on the court's screen.");
      refs.current[code.length]?.focus();
      return;
    }
    router.push(`/g/${code}`);
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-panel)] bg-ink p-5 text-white sm:p-6" aria-labelledby="join-title">
      <h2 id="join-title" className="display text-[1.75rem] font-bold">
        Join with a code
      </h2>
      <p className="mt-1 max-w-sm text-[0.95rem] text-white/75">
        Someone on court can show you their game&rsquo;s code or QR. Type it in to join a team or the queue.
      </p>
      <div className="mt-4 flex items-center gap-1.5 sm:gap-2" role="group" aria-label="Game code">
        {chars.map((ch, i) => (
          <span key={i} className="contents">
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={ch}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              aria-label={`Character ${i + 1} of 6`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              maxLength={6}
              size={1}
              className="display h-14 min-w-0 flex-1 rounded-[var(--radius-control)] border-2 border-white/20 bg-white/5 text-center text-[2rem] font-bold uppercase text-white outline-none transition-colors focus:border-ball focus:bg-white/10 sm:h-16 sm:w-14 sm:flex-none"
            />
            {i === 2 && (
              <span aria-hidden="true" className="px-0.5 text-2xl text-white/40">
                –
              </span>
            )}
          </span>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[0.9rem] font-medium text-ball">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] bg-ball px-5 font-semibold text-ink transition-transform active:scale-[0.98] sm:w-auto"
      >
        Join game
      </button>
    </form>
  );
}
