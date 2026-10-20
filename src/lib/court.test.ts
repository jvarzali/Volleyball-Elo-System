import { describe, expect, it } from "vitest";
import { firstGameState, holderDeparture, nextOnCourt, pickNext } from "./court";

describe("nextOnCourt (§4.8)", () => {
  it("keeps the winner under a win cap until the cap is hit", () => {
    const first = nextOnCourt("cap_2", firstGameState(), "A");
    expect(first).toMatchObject({ stays: "A", openSlots: 1 });
    const second = nextOnCourt("cap_2", { holder: "A", holderWinStreak: 1, holderGamesInRow: 1, challengerGamesInRow: 0 }, "A");
    expect(second).toEqual({ stays: null, openSlots: 2, carry: null });
  });

  it("lets a no-limit winner stay indefinitely", () => {
    const r = nextOnCourt("no_limit", { holder: "A", holderWinStreak: 9, holderGamesInRow: 9, challengerGamesInRow: 0 }, "A");
    expect(r.stays).toBe("A");
  });

  it("keeps the challenger on a tie", () => {
    expect(nextOnCourt("cap_3", firstGameState(), "tie").stays).toBe("B");
    expect(nextOnCourt("cap_3", { holder: "B", holderWinStreak: 2, holderGamesInRow: 2, challengerGamesInRow: 0 }, "tie").stays).toBe("A");
  });

  it("sends both teams off on a DNF", () => {
    expect(nextOnCourt("no_limit", firstGameState(), "dnf")).toEqual({ stays: null, openSlots: 2, carry: null });
  });

  it("follows the rotation example: T1 beats T2, then T1 always comes off", () => {
    const g1 = nextOnCourt("rotation", firstGameState(), "A");
    expect(g1.stays).toBe("A");
    const g2 = nextOnCourt("rotation", { holder: "A", holderWinStreak: 1, holderGamesInRow: 1, challengerGamesInRow: 0 }, "A");
    expect(g2.stays).toBe("B");
  });
});

describe("pickNext (§4.9)", () => {
  const riley = { id: "riley", size: 4 };
  const spikers = { id: "spikers", size: 6 };
  const mo = { id: "mo", size: 6 };

  it("waits for the fill window when a forming entry is in front", () => {
    const r = pickNext([riley, spikers, mo], 1, 6, false);
    expect(r).toMatchObject({ called: [], waitingForFill: true });
  });

  it("calls the first ready team after the window and slides Riley back one slot", () => {
    const r = pickNext([riley, spikers, mo], 1, 6, true);
    expect(r.called.map((e) => e.id)).toEqual(["spikers"]);
    expect(r.queue.map((e) => e.id)).toEqual(["riley", "mo"]);
  });

  it("calls a full front entry immediately", () => {
    const r = pickNext([{ ...riley, size: 6 }, spikers], 1, 6, false);
    expect(r.called.map((e) => e.id)).toEqual(["riley"]);
  });

  it("lets the front entry play short-handed when nobody is ready", () => {
    const r = pickNext([riley, { id: "duo", size: 2 }], 1, 6, true);
    expect(r.called.map((e) => e.id)).toEqual(["riley"]);
  });

  it("fills two slots after a capped win or DNF", () => {
    const r = pickNext([spikers, riley, mo], 2, 6, true);
    expect(r.called.map((e) => e.id)).toEqual(["spikers", "mo"]);
    expect(r.queue.map((e) => e.id)).toEqual(["riley"]);
  });
});

describe("holderDeparture (§4.8.1)", () => {
  it("loses the court when more than half leave, refills otherwise", () => {
    expect(holderDeparture(6, 4)).toBe("loses");
    expect(holderDeparture(6, 3)).toBe("refill");
    expect(holderDeparture(2, 1)).toBe("refill");
    expect(holderDeparture(2, 2)).toBe("loses");
    expect(holderDeparture(6, 0)).toBe("keeps");
  });
});
