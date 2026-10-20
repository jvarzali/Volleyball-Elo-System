"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, Compass, Settings, UserRound } from "lucide-react";
import { ME } from "@/lib/data";

const items = [
  { href: "/", label: "Discover", icon: Compass, match: (p: string) => p === "/" || p.startsWith("/g/") },
  { href: "/new", label: "New game", icon: CirclePlus, match: (p: string) => p === "/new" },
  { href: `/p/${ME}`, label: "Profile", icon: UserRound, match: (p: string) => p.startsWith("/p/") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p === "/settings" },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Volleyball Elo, go to Discover">
      <BallMark />
      <span className="display text-[1.65rem] font-extrabold text-ink">Volleyball Elo</span>
    </Link>
  );
}

/** Three-panel ball in the two team colors. */
function BallMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="var(--color-ball)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M16 1.5c-2 6.5-.5 12 5.5 16.5s11.5 3.5 9 4" fill="var(--color-court)" />
      <path d="M2.2 20.5C8 18 13.5 18.5 18 23s4 7.5 3.5 7.5" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M16 1.5c-2 6.5-.5 12 5.5 16.5" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M21.5 18c-6 2-11.5 1-16.5-6" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
    </svg>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: top bar */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-paper/90 backdrop-blur md:block">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Wordmark />
          <ul className="flex items-center gap-1">
            {items.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors ${
                      active ? "bg-ink text-white" : "text-ink-2 hover:bg-line-2 hover:text-ink"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Mobile: compact header + bottom tabs */}
      <header className="flex h-14 items-center border-b border-line bg-paper px-4 md:hidden">
        <Wordmark />
      </header>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {items.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    active ? "text-court" : "text-ink-3"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
