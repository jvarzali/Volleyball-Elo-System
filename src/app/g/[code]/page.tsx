import { notFound } from "next/navigation";
import { GameRoom } from "@/components/game/GameRoom";
import { ME, gameByCode, locationById, type Game } from "@/lib/data";
import type { Rotation } from "@/lib/court";

const ROTATIONS: Rotation[] = ["cap_2", "cap_3", "no_limit", "rotation"];

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { code: raw } = await params;
  const q = await searchParams;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  let game = gameByCode.get(code);

  // A game just created on /new. The real app saves it first; the draft builds it from the form.
  if (!game && q.loc && locationById.has(q.loc)) {
    const loc = locationById.get(q.loc)!;
    game = {
      code,
      locationId: loc.id,
      court: q.court || "1",
      format: q.format === "beach" || q.format === "indoor" ? q.format : loc.format,
      rotation: ROTATIONS.includes(q.rotation as Rotation) ? (q.rotation as Rotation) : "cap_2",
      skill: q.skill || undefined,
      start: q.start || "Starting now",
      day: "today",
      status: "open",
      teamA: [ME],
      teamB: [],
      queue: [],
      gameNumber: 1,
    } satisfies Game;
  }

  if (!game) notFound();
  return <GameRoom key={game.code} game={game} />;
}
