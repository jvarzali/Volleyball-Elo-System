import { Building2, Flag, Sun } from "lucide-react";
import type { Format, Player } from "@/lib/data";
import { initials } from "@/lib/data";

export function Avatar({
  player,
  size = 40,
  ring,
  className = "",
}: {
  player: Player;
  size?: number;
  ring?: "court" | "ball" | "me";
  className?: string;
}) {
  const ringClass =
    ring === "me"
      ? "ring-[3px] ring-ink"
      : ring === "court"
        ? "ring-2 ring-white"
        : ring === "ball"
          ? "ring-2 ring-ink/80"
          : "";
  return (
    <span
      role="img"
      aria-label={player.name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${ringClass} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: `hsl(${player.hue} 52% 86%)`,
        color: `hsl(${player.hue} 55% 24%)`,
      }}
    >
      {initials(player)}
    </span>
  );
}

export function FormatTag({ format, className = "" }: { format: Format; className?: string }) {
  const indoor = format === "indoor";
  const Icon = indoor ? Building2 : Sun;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-medium ${
        indoor ? "bg-court-tint text-court-deep" : "bg-sand-tint text-[#6d5521]"
      } ${className}`}
    >
      <Icon size={14} aria-hidden="true" />
      {indoor ? "Indoor" : "Beach"}
    </span>
  );
}

export function Delta({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null) return <span className={`num text-ink-3 ${className}`}>No change</span>;
  const rounded = Math.round(value * 10) / 10;
  const up = rounded > 0;
  const zero = rounded === 0;
  return (
    <span className={`num font-semibold ${zero ? "text-ink-3" : up ? "text-up" : "text-down"} ${className}`}>
      {zero ? "±0.0" : `${up ? "+" : "−"}${Math.abs(rounded).toFixed(1)}`}
    </span>
  );
}

export function FlagBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-flag-tint px-2 py-0.5 text-[0.78rem] font-semibold text-flag"
      title="This player's recent results have been disputed. They can't confirm or dispute results right now."
    >
      <Flag size={12} aria-hidden="true" />
      {compact ? "Flagged" : "Flagged for disputed results"}
    </span>
  );
}

/**
 * A tiny top-down court: one dot per spot, filled dots are players.
 * Shows at a glance how full each side is.
 */
export function CourtGlyph({
  format,
  a,
  b,
  live,
}: {
  format: Format;
  a: number;
  b: number;
  live?: boolean;
}) {
  const size = format === "indoor" ? 6 : 2;
  const beach = format === "beach";
  const spots = (filled: number, side: "a" | "b") => {
    const cols = beach ? 1 : 2;
    const rows = beach ? 2 : 3;
    const out = [];
    for (let i = 0; i < size; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x0 = side === "a" ? 6 : 38;
      const cx = beach ? x0 + 10 : x0 + 5 + col * 10;
      const cy = 8 + row * (beach ? 16 : 10) + (beach ? 4 : 0);
      const isFilled = i < filled;
      out.push(
        <circle
          key={`${side}${i}`}
          cx={cx}
          cy={cy}
          r={3.4}
          fill={isFilled ? (side === "a" ? (beach ? "var(--color-court)" : "#fff") : "var(--color-ball)") : "none"}
          stroke={isFilled ? "none" : beach ? "var(--color-sand-deep)" : "rgb(255 255 255 / 0.55)"}
          strokeWidth={1.2}
        />,
      );
    }
    return out;
  };
  return (
    <svg width="68" height="44" viewBox="0 0 64 44" aria-hidden="true" className="shrink-0">
      <rect x="0.5" y="0.5" width="63" height="43" rx="6" fill={beach ? "var(--color-sand)" : "var(--color-court-zone)"} />
      <rect x="3" y="3" width="58" height="38" rx="2" fill={beach ? "var(--color-sand)" : "var(--color-court-floor)"} stroke={beach ? "var(--color-court)" : "#fff"} strokeWidth="1" />
      <line x1="32" y1="1" x2="32" y2="43" stroke={beach ? "var(--color-ink)" : "#fff"} strokeWidth="2" />
      {!beach && (
        <>
          <line x1="22" y1="3" x2="22" y2="41" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />
          <line x1="42" y1="3" x2="42" y2="41" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />
        </>
      )}
      {spots(a, "a")}
      {spots(b, "b")}
      {live && <circle cx="58" cy="6" r="3" fill="#36d27a" stroke="#fff" strokeWidth="1" />}
    </svg>
  );
}

export function SectionHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="display text-[1.9rem] font-bold text-ink">{children}</h2>
      {aside}
    </div>
  );
}
