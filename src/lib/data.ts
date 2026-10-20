// Sample data for the draft UI. Replaced by the database in Phase 2 (PLAN.md §9).

import type { Rotation } from "./court";

export type Format = "indoor" | "beach";

export interface Player {
  id: string;
  name: string;
  username: string;
  nickname?: string;
  indoor: { rating: number; games: number; w: number; t: number; l: number };
  beach: { rating: number; games: number; w: number; t: number; l: number };
  instagram?: string;
  tiktok?: string;
  positions?: string[];
  home?: string;
  flagged?: boolean;
  /** avatar hue, stands in for a profile picture */
  hue: number;
}

export interface Location {
  id: string;
  name: string;
  area: string;
  format: Format;
  courts: number;
  notes: string;
}

export interface QueueEntry {
  id: string;
  name: string;
  members: string[];
  queuedAt: string;
}

export interface Game {
  code: string;
  locationId: string;
  court: string;
  format: Format;
  rotation: Rotation;
  skill?: string;
  /** ISO-ish local time label for the draft */
  start: string;
  day: "live" | "today" | "week";
  status: "open" | "live";
  teamA: string[];
  teamB: string[];
  queue: QueueEntry[];
  holderStreak?: number;
  gameNumber: number;
}

export const ME = "alex";

const p = (
  id: string,
  name: string,
  indoor: [number, number, number, number, number],
  beach: [number, number, number, number, number],
  hue: number,
  extra: Partial<Player> = {},
): Player => ({
  id,
  name,
  username: id,
  indoor: { rating: indoor[0], games: indoor[1], w: indoor[2], t: indoor[3], l: indoor[4] },
  beach: { rating: beach[0], games: beach[1], w: beach[2], t: beach[3], l: beach[4] },
  hue,
  ...extra,
});

export const players: Player[] = [
  p("alex", "Alex Moreno", [1584, 61, 34, 4, 23], [1512, 18, 9, 1, 8], 212, {
    nickname: "Mo",
    instagram: "alexmoreno.vb",
    positions: ["Outside hitter"],
    home: "Westside Rec Center",
  }),
  p("priya", "Priya Raman", [1712, 88, 55, 3, 30], [1640, 40, 25, 2, 13], 330, { instagram: "priya.sets", positions: ["Setter"] }),
  p("dante", "Dante Okafor", [1866, 120, 81, 5, 34], [1498, 9, 4, 0, 5], 18, { nickname: "Big D", positions: ["Middle blocker"] }),
  p("lena", "Lena Fischer", [1533, 27, 13, 2, 12], [1702, 64, 40, 3, 21], 160, { tiktok: "lenadigs", positions: ["Libero"] }),
  p("marcus", "Marcus Hale", [1490, 33, 15, 1, 17], [1455, 14, 6, 0, 8], 260),
  p("sofia", "Sofia Duarte", [1627, 52, 30, 2, 20], [1588, 22, 12, 1, 9], 290, { instagram: "sofi.duarte" }),
  p("kenji", "Kenji Watanabe", [2104, 210, 150, 6, 54], [1820, 70, 47, 2, 21], 200, { nickname: "Kenj", positions: ["Opposite"] }),
  p("tasha", "Tasha Brooks", [1558, 41, 21, 3, 17], [1611, 30, 17, 1, 12], 350),
  p("omar", "Omar Haddad", [1500, 6, 3, 0, 3], [1500, 0, 0, 0, 0], 40),
  p("jules", "Jules Martin", [1475, 19, 8, 1, 10], [1530, 25, 13, 0, 12], 120, { flagged: true }),
  p("rae", "Rae Kim", [1690, 77, 45, 4, 28], [1745, 59, 38, 1, 20], 300, { instagram: "raekim" }),
  p("theo", "Theo Laurent", [1610, 48, 26, 2, 20], [1480, 11, 5, 0, 6], 230),
  p("nia", "Nia Adeyemi", [1545, 30, 16, 1, 13], [1660, 45, 27, 2, 16], 10),
  p("cole", "Cole Barrett", [1452, 22, 9, 0, 13], [1390, 8, 3, 0, 5], 80),
  p("ivy", "Ivy Chen", [1738, 95, 60, 2, 33], [1702, 50, 31, 1, 18], 180, { positions: ["Setter"] }),
  p("ruben", "Ruben Soto", [1599, 39, 21, 1, 17], [1555, 20, 11, 0, 9], 30),
  p("maya", "Maya Lindqvist", [1520, 12, 6, 0, 6], [1781, 88, 58, 3, 27], 190, { instagram: "maya.sand" }),
  p("eli", "Eli Novak", [1661, 58, 33, 2, 23], [1500, 3, 1, 0, 2], 245),
  p("grace", "Grace Owusu", [1580, 35, 19, 1, 15], [1612, 33, 18, 2, 13], 320),
  p("sam", "Sam Whitaker", [1505, 15, 7, 1, 7], [1569, 26, 14, 1, 11], 60),
  p("ana", "Ana Petrova", [1640, 70, 39, 3, 28], [1688, 41, 25, 1, 15], 275),
  p("ben", "Ben Achebe", [1488, 9, 4, 0, 5], [1500, 0, 0, 0, 0], 100),
];

export const playerById = new Map(players.map((pl) => [pl.id, pl]));
export const getPlayer = (id: string) => playerById.get(id);

export const locations: Location[] = [
  { id: "westside", name: "Westside Rec Center", area: "Westside", format: "indoor", courts: 3, notes: "Free after 6pm. Park in the back lot." },
  { id: "harbor", name: "Harbor Beach", area: "Harbor District", format: "beach", courts: 6, notes: "Courts 1–4 have lights until 10pm." },
  { id: "brigid", name: "St. Brigid's Gym", area: "Midtown", format: "indoor", courts: 1, notes: "$5 drop-in. Net is set to men's height." },
  { id: "lakefront", name: "Lakefront Sand Courts", area: "North Shore", format: "beach", courts: 4, notes: "Bring your own ball on weekdays." },
];

export const locationById = new Map(locations.map((l) => [l.id, l]));

export const games: Game[] = [
  {
    code: "K7P2QX",
    locationId: "westside",
    court: "2",
    format: "indoor",
    rotation: "cap_2",
    skill: "Intermediate+",
    start: "Started 6:40pm",
    day: "live",
    status: "live",
    teamA: ["priya", "dante", "alex", "sofia", "theo", "marcus"],
    teamB: ["kenji", "ivy", "rae", "grace", "ruben", "cole"],
    holderStreak: 1,
    gameNumber: 3,
    queue: [
      { id: "q1", name: "Lena's group", members: ["lena", "tasha", "nia", "omar"], queuedAt: "6:52pm" },
      { id: "q2", name: "Spikers", members: ["eli", "ana", "sam", "ben", "jules", "maya"], queuedAt: "6:58pm" },
    ],
  },
  {
    code: "H4RB9R",
    locationId: "harbor",
    court: "3",
    format: "beach",
    rotation: "no_limit",
    start: "Started 6:15pm",
    day: "live",
    status: "live",
    teamA: ["maya", "lena"],
    teamB: ["rae", "nia"],
    holderStreak: 4,
    gameNumber: 6,
    queue: [
      { id: "q3", name: "Ana + Tasha", members: ["ana", "tasha"], queuedAt: "6:44pm" },
      { id: "q4", name: "Sam", members: ["sam"], queuedAt: "6:50pm" },
    ],
  },
  {
    code: "BRG7MT",
    locationId: "brigid",
    court: "1",
    format: "indoor",
    rotation: "rotation",
    skill: "All levels",
    start: "Tonight, 8:00pm",
    day: "today",
    status: "open",
    teamA: ["eli", "ana", "omar", "ben"],
    teamB: ["sam", "cole", "jules"],
    gameNumber: 1,
    queue: [],
  },
  {
    code: "KFR3SA",
    locationId: "lakefront",
    court: "1",
    format: "beach",
    rotation: "cap_3",
    start: "Tonight, 7:30pm",
    day: "today",
    status: "open",
    teamA: ["grace"],
    teamB: [],
    gameNumber: 1,
    queue: [],
  },
  {
    code: "WSD9TU",
    locationId: "westside",
    court: "1",
    format: "indoor",
    rotation: "cap_2",
    skill: "Advanced",
    start: "Tue, 7:00pm",
    day: "week",
    status: "open",
    teamA: ["kenji", "priya", "dante"],
    teamB: ["ivy", "rae"],
    gameNumber: 1,
    queue: [],
  },
  {
    code: "HRB5SN",
    locationId: "harbor",
    court: "1",
    format: "beach",
    rotation: "cap_2",
    start: "Sat, 10:00am",
    day: "week",
    status: "open",
    teamA: ["maya"],
    teamB: ["lena", "tasha"],
    gameNumber: 1,
    queue: [],
  },
];

export const gameByCode = new Map(games.map((g) => [g.code, g]));

export function formatCode(code: string) {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export function displayName(pl: Player) {
  return pl.nickname ?? pl.name.split(" ")[0];
}

export function initials(pl: Player) {
  return pl.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
}

/** Recent rating history for the profile sparkline, newest last. */
export function ratingHistory(pl: Player, format: Format): number[] {
  const end = pl[format].rating;
  const n = Math.min(24, Math.max(4, pl[format].games));
  const seed = pl.hue + (format === "beach" ? 7 : 0);
  const out: number[] = [];
  let r = 1500;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wobble = Math.sin((i + seed) * 1.7) * 14 + Math.cos((i + seed) * 0.6) * 9;
    r = 1500 + (end - 1500) * t + wobble * (1 - t * 0.6);
    out.push(i === n - 1 ? end : r);
  }
  return out;
}

export interface RecentGame {
  when: string;
  where: string;
  format: Format;
  result: "W" | "T" | "L" | "DNF";
  score?: string;
  delta: number | null;
}

export const recentGames: Record<string, RecentGame[]> = {
  alex: [
    { when: "Tonight", where: "Westside Rec Center, Court 2", format: "indoor", result: "W", score: "25–21", delta: 9.6 },
    { when: "Tonight", where: "Westside Rec Center, Court 2", format: "indoor", result: "L", score: "19–25", delta: -14.1 },
    { when: "Sun", where: "Harbor Beach, Court 4", format: "beach", result: "T", score: "1–1", delta: 3.2 },
    { when: "Sun", where: "Harbor Beach, Court 4", format: "beach", result: "DNF", delta: null },
    { when: "Thu", where: "St. Brigid's Gym, Court 1", format: "indoor", result: "W", score: "25–17", delta: 12.8 },
  ],
};

/**
 * The signed-in player's friends, and whether each friend has given them
 * authority (PLAN.md §4.6). Authority means "can add, move, or remove me".
 */
export const myFriends: Array<{ id: string; grantsMeAuthority: boolean; iGrantAuthority: boolean }> = [
  { id: "priya", grantsMeAuthority: true, iGrantAuthority: true },
  { id: "tasha", grantsMeAuthority: true, iGrantAuthority: false },
  { id: "omar", grantsMeAuthority: true, iGrantAuthority: true },
  { id: "lena", grantsMeAuthority: false, iGrantAuthority: true },
  { id: "sofia", grantsMeAuthority: false, iGrantAuthority: false },
  { id: "nia", grantsMeAuthority: false, iGrantAuthority: false },
  { id: "ben", grantsMeAuthority: true, iGrantAuthority: false },
  { id: "cole", grantsMeAuthority: false, iGrantAuthority: false },
];

export interface Comment {
  by: string;
  when: string;
  body: string;
}

export const commentsByGame: Record<string, Comment[]> = {
  K7P2QX: [
    { by: "dante", when: "6:31pm", body: "Net on court 2 is already up. Bring water, the fountain is broken again." },
    { by: "lena", when: "6:52pm", body: "We've got 4, need 2 more for next. Anyone?" },
  ],
  BRG7MT: [{ by: "eli", when: "2:10pm", body: "Drop-in is $5 cash at the desk." }],
};
