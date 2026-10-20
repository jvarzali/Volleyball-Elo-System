# Volleyball Elo System — Project Plan

A website for finding and signing up for local volleyball (indoor and beach), and tracking player skill with a chess-style Elo rating built from self-reported match results.

---

## 1. Goals

1. **Scheduling first.** The main page is "who's playing, where, and when." Anyone can create a game at a set time and place. Others browse upcoming games at local gyms and beach courts and join, so everyone can see who's showing up. There are no hosts or leaders: every member of a game is equal.
2. **Fair team-based ratings that respect the individual.** Every rated match updates each player's Elo using the ratings of *all* teammates and *all* opponents, **and** that player's own rating. A strong player on a weak team should be expected to win more, so they gain less for a win and lose more for a loss or tie.
3. **Works with mixed groups.** Games still count when some players have no account, with smaller rating changes the more unrated players are involved.
4. **Player profiles.** Name, optional username/nickname, an indoor rating and a beach rating, profile picture, and optional social handles (Instagram, etc.).

### Non-goals (for v1)
- Tournament brackets, leagues, payments, or court booking with the gym itself.
- Native mobile apps (the site should be mobile-first and responsive instead).
- Live scorekeeping.

---

## 2. Formats and Ratings

| Format | Players per side | Teammates | Opponents |
|--------|------------------|-----------|-----------|
| Indoor | 6 | 5 | 6 |
| Beach  | 2 | 1 | 2 |

**Every player has two separate ratings: Indoor and Beach.** These are different games, and plenty of players are strong at one and new to the other.
- Both start at 1500, and each is provisional until that format reaches its game threshold (see 3.6).
- A match updates **only** the rating for its own format.
- Profiles, leaderboards, and session rosters always show the rating for the format being viewed.

---

## 3. Elo System

### 3.1 Overview

The system adapts standard chess Elo to teams in three steps:

1. **Team ratings.** Each side gets a team rating: the average of its rated players.
2. **Personal expected score.** Each rated player's *effective rating* blends their own rating with their team's rating. Their expected score is that effective rating measured against the opposing team's rating.
3. **Rating change.** The change is `K × M × (S − E_i)`. `M` shrinks the change for each unrated player in the match.

The individual blend in step 2 is what makes a 2200 player on a team of 1500s expect to win far more often than their teammates do. That player gains little from a win and loses a lot from a loss or tie.

### 3.2 Team rating, including unrated players

```
R_team = average rating of the rated players on that side
```

An unrated player in effect takes on the average of their rated teammates, so the team average is the same as the average of the rated players. This follows the spec: unrated players' Elo is "averaged to the team."

**Minimum requirement:** a match is only **rated** if **each side has at least one rated player**. With no rated player on a side there is nothing to measure against, and allowing it would let people farm points off made-up opponents. A match that fails this check can still be logged as an *unrated* game, which counts for history and games played but changes no ratings.

### 3.3 Individual expected score

For rated player `i` on side A, playing against side B:

```
R_eff_i = α × R_i + (1 − α) × R_A        (α = 0.5 to start; tunable)

E_i = 1 / (1 + 10^((R_B − R_eff_i) / 400))
```

- `R_i` is the player's own rating in this format, and `R_A` is their team's rating (which includes them).
- `α` sets how much the individual matters:
  - `α = 0` is a pure team model, where everyone on a side has the same expectation.
  - `α = 1` treats the player as if they were facing the other team alone.
  - `0.5` is a balanced starting point. It can be tuned separately per format if data shows that one strong beach player swings a match more than one strong indoor player.
- The opponent side is always measured by its **team** rating `R_B`. Players are judged against the whole opposing lineup, not against one opponent.

### 3.4 Result values (win, tie, loss, did not finish)

| Result | S | Rated? |
|--------|---|--------|
| Win | 1 | Yes |
| Tie | 0.5 | Yes |
| Loss | 0 | Yes |
| **Did not finish (DNF)** | — | **No.** The game is recorded, but no one's rating changes |

**Tie:** covers timed rec games that end level, series that split 1–1, or any game the players agree was even. A tie **does** change ratings, because it is a better-than-expected result for the underdog:
- A player whose expected score is below 0.5 **gains** rating.
- A player whose expected score is above 0.5 **loses** rating, as the favorite who failed to win.
- The bigger the rating gap, the bigger the swing.
- *Example (K = 32, M = 1, every player on each team has the same rating):* a 1400 team ties a 1700 team. The 1400 team's expected score is 0.15, so each of its players gets **+11.2**, and each 1700 player gets **−11.2**. If the 1400 team had won outright, each would have gained +27.2.

**Did not finish:** for games that stop early (injury, lost the court, rain, ran out of time) with no real result. A DNF never reaches the Elo engine and doesn't count toward games played or W–T–L. It can still be disputed, for example if the game actually finished and the losing side called it a DNF (see §5).

### 3.5 Rating change and coverage multiplier

```
ΔR_i = K_i × M × (S − E_i)

M = (rated players in the match) / (total players in the match)
```

| Format | Unrated players | M |
|--------|-----------------|------|
| Indoor (12 total) | 0 | 1.00 |
| Indoor | 1 | 0.917 |
| Indoor | 3 | 0.75 |
| Indoor | 6 | 0.50 |
| Beach (4 total) | 0 | 1.00 |
| Beach | 1 | 0.75 |
| Beach | 2 | 0.50 |

- Each unrated player reduces the change by the same step, as the spec asks.
- One beach unknown matters more than one indoor unknown, because that player is a bigger share of the match.
- *Option to tune later:* add a floor (for example `M ≥ 0.25`), or use `M²` to punish low coverage harder.
- **Zero-sum note:** individual expectations mean total points gained won't exactly equal total points lost. The gap is small, usually a few points per match. If the rating pool drifts over time, add a normalization step that scales each side's changes so the total sums to zero.

### 3.6 K-factor

| Player state (per format) | K |
|---------------------------|----|
| Provisional (fewer than 15 rated games in this format) | 48 |
| Established | 32 |
| High rated (≥ 2000) | 24 |

A provisional player's rating moves fast, so they reach their real level quickly. Provisional status is tracked **separately** for indoor and beach.

### 3.7 Worked examples

*K = 32 and M = 1 for everyone in these examples, so the numbers are easy to compare.*

**Elite player with 11 average players (indoor).** Team A has one 2200 player and five 1500s. Team B has six 1500s.

- `R_A = (2200 + 5 × 1500) / 6 ≈ 1617`, `R_B = 1500`

| Player | R_eff | E | Win | Tie | Loss |
|--------|-------|------|------|------|------|
| A: 2200 elite | 1908 | 0.913 | **+2.8** | **−13.2** | **−29.2** |
| A: 1500 teammate | 1558 | 0.583 | +13.3 | −2.7 | −18.7 |
| B: 1500 opponent | 1500 | 0.338 | +21.2 | +5.3 | −10.8 |

In this example (the B column shows B's change for each of A's results):
- The team ratings are only 117 points apart, but the elite player earns almost nothing for the expected win.
- The elite player takes the biggest hit of anyone when their team loses or ties.
- Under a pure team model (`α = 0`), the elite player would have gained +10.8 for the win, the same as their teammates. That is what the spec rules out.

**Mixed indoor match with unrated players.** Team A has 5 rated players (1600, 1550, 1500, 1450, 1400) and 1 unrated player. Team B has 4 rated players (1650, 1600, 1550, 1500) and 2 unrated players.

- `R_A = 1500`, `R_B = 1575`
- `M = 9 / 12 = 0.75`, so the effective multiplier is `K × M = 24`

| A player | R_eff | E | Win | Tie | Loss |
|----------|-------|------|------|------|------|
| 1600 | 1550 | 0.464 | +12.9 | +0.9 | −11.1 |
| 1500 | 1500 | 0.394 | +14.5 | +2.5 | −9.5 |
| 1400 | 1450 | 0.328 | +16.1 | +4.1 | −7.9 |

**Beach.** Team A is one 1500-rated player plus one unrated partner. Team B is 1600 and 1500.

- `R_A = 1500`, `R_B = 1550`
- `M = 0.75`
- If Team A wins: the A player gets **+13.7**. On Team B, the 1600 player gets **−14.6** and the 1500 player gets **−12.9**.

### 3.8 Possible later additions
- **Margin of victory:** scale the change slightly by set or point differential (for example 2–0 vs 2–1, or 25–10 vs 25–23).
- **Rating deviation / confidence (Glicko-2 style):** a better fit for infrequent players than fixed K tiers.
- **Inactivity:** show "inactive" after 90 days, without decaying the rating.

---

## 4. Games, Courts, and Queues — Core Feature

A **game** is one match on one court at a set time: Team A vs Team B, ending with one result. It is both the public listing ("Westside Gym, Court 3, Tue 7pm — 9 going, 2 teams in queue") and the live lobby where teams form and the result is recorded.
- "Match" in §3 means a game.
- There are no hosts, owners, or leaders. Every member has exactly the same abilities.
- Games on the same court link into a **court chain**. The winners stay on, and the next team in the **queue** challenges them (4.8–4.9), the way open gyms and beach courts already run.

### 4.1 Locations and courts
- A location is a gym or beach court with a name, address, map pin, format(s) (indoor/beach), number of courts (optional), notes (parking, fees, net height), and photos.
- New locations are submitted by users and approved by an admin, to avoid duplicates and fake locations.
- Each location page shows its courts with the current game and queue on each, its upcoming games, its regulars, and a local leaderboard.

### 4.2 Creating a game

Anyone can create a game by entering:

| Field | Notes |
|-------|-------|
| **Location** | Required; picked from approved locations |
| **Court #** | Optional, free text (for example "3", "North", "Sand 2"). Picked from 1…N if the location lists its court count |
| **Start time** | Required; "Now" is allowed for a game already happening |
| Format | Indoor or beach; defaults from the location |
| Skill label | Optional, for example "Intermediate+" |
| **Court rotation** | Required, default **Win cap 2**. Options: **Win cap 2**, **Win cap 3**, **No limit**, or **Rotation (no king of the court)**. Applies to every game in the court chain (4.8) |
| Repeat weekly | Optional; creates **separate, independent** games for the next 4 weeks |

**Game details are locked when the game is created.** No one can edit the location, court, start time, or format, including the person who created it. If plans change, people leave the game and someone creates a new one.

The creator is just the first member. The plan records who created the game for history, but that gives them no extra powers.

**Duplicate courts:** if someone tries to create a game on a court that already has an open or started game, they're offered that court's **queue** instead (4.9). They can still create the game if the court # was left blank or it's a different time.

### 4.3 Everyone is equal

| Action | Who can do it |
|--------|---------------|
| Join a team in an **open** game | Anyone with room on that team (via Discover, QR code, short code, or link) |
| Join the **queue** | Anyone, at any time, whether the game is open or started (4.9) |
| Leave a team | Yourself, while the game is **open** |
| Leave the queue | Yourself, at any time |
| Switch your own team or queue entry | Yourself, while the game is **open** (queue entries: any time) |
| Add a player | Any member who has **friend authority** over that player (4.6); otherwise it becomes an invite |
| Move or remove a player | Any member who has **friend authority** over that player, no matter who added them. Teams: while the game is **open**. Queue: any time |
| Add, move, or remove a guest (no account) | Any member, under the same timing rules |
| Start the game | Any member on a team |
| End the game and record the result | **Any one player** on a team, alone, at any time after start |
| Confirm or dispute the result | Every account that played, except flagged players (§5) |
| Edit location, court, time, or format | **Nobody** |

Nobody can move or remove a player they don't have friend authority over. There is no other way to control another person.

### 4.4 Game lifecycle

```
OPEN (creator is the 1st member)
   │  join, leave, add, remove, swap teams; queue forms alongside
   │
   ├── no team members AND empty queue ──► VANISHES
   │
   └── any player taps START GAME
          ▼
       STARTED ── team rosters frozen; queue stays open
          │
          ├── any ONE player taps END GAME and records the result (A wins / B wins / Tie / DNF)
          │      ▼
          │   ENDED ── result goes to the dispute window (§5)
          │      │
          │      └─► NEXT GAME on the same court is created at once (4.8):
          │            winners stay, the queue supplies challengers, losers are released
          │
          └── nobody ends it within 3h of start ──► CLOSED, NO RESULT (unrated, no votes)
```

- **Members only, no one in charge:** if the creator leaves an open game while others remain, the game simply continues.
- **Vanishing:** an **open** game is deleted when it has no one on either team **and** an empty queue.
- **Locked after start:** once started, no one can leave a team, be removed, switch, or join a team. This stops a player from dropping out to dodge a loss. The **queue** is still open the whole time.
- **One active spot per player:** a player can be on one team **or** in one queue entry at a time. Joining another asks them to leave the first, which is only possible if they aren't in a started game.

### 4.5 Discover and joining

**Discover (home page):**
- Games near the player, both live and upcoming, filterable by format, day, time, distance, and skill level.
- Each card shows:
  - the location, court #, and time;
  - "Live" or "Starts 7:00";
  - team fill (for example 6/6 vs 4/6);
  - **queue length** (for example "2 teams + 3 players waiting");
  - the average rating in that format, avatars, and "3 friends here."
- Tapping a card opens the game page, with **Join Team A**, **Join Team B**, and **Join queue** buttons.

**Joining from on court (or anywhere):** every game has all three of these, shown together on the game page:

| Method | How it works |
|--------|--------------|
| **QR code** | Any member can show it full-screen. Others scan it with their phone camera, which opens `/g/<code>` directly. |
| **Short code** | 6 characters, for example `K7P-2QX`, typed into **Join game** on the home screen. The alphabet leaves out lookalikes (`0/O`, `1/I/L`), and input is case-insensitive. |
| **Invite link** | Shared through the phone's native share sheet (text, group chat, Instagram DM), or copied. |

If a logged-out player uses any of these, they sign in or make a quick account first, then land back on the same game.

Rules for codes:
- The code belongs to the **court chain**, so it keeps working from game to game on that court and always opens the current game and its queue.
- A code stops working when the chain ends (4.8).
- Failed code attempts are rate-limited, to stop people guessing codes.

**Game page:**
- Location, court #, and time, with a map.
- Team A and Team B with ratings, and the **queue**, showing each entry's position, members, and fill (for example "4/6 — needs 2").
- A comment thread (for example "bringing a net", "running 10 min late").
- The QR code, short code, and link.
- An add-to-calendar (.ics) button.

**My games:** the player's own upcoming games and queue spots, plus calendar export.

### 4.6 Friend authority

Each player decides which friends have **authority** over them. Authority is a single permission. A friend who has it can, in any game or queue they are both part of (or, for adding, that the friend is in):
- **add** the player to a team or a queue entry;
- **move** the player between teams or queue entries;
- **remove** the player.

This applies **no matter who originally added the player**. If Sam added Alex, and Jordan also has authority over Alex, then Jordan can move or remove Alex too.

| Player's setting | Who has authority over them |
|------------------|-----------------------------|
| **All my friends** | Every accepted friend |
| **Selected friends** | Only friends on the player's allowlist |
| **Nobody — always ask me** (default) | No one. Adds become invites, and no one else can move or remove them |

What happens when someone tries to bring in a friend:
- **With authority:** the friend is added immediately and notified.
- **Without authority:** the friend gets an invite, which they can accept or decline. An accepted invite gives the inviter **no** authority.

Settings and limits:
- Players manage this in **Settings → Who has authority over me**. They can also flip the toggle from any friend's profile.
- Unfriending removes authority immediately.
- Authority follows the timing rules in 4.3. Team rosters are frozen once a game starts; queue entries never are.
- Every add, move, and remove sends the affected player a notification ("Jordan moved you to Team B"), so nothing happens behind their back.
- Non-friends can't be added or invited directly. They join themselves through Discover, the QR code, the short code, or the link.
- Guests (no account) can be added by name by any member, and count as unrated (see 3.2).

This is how a full team joins the queue in one step: one player creates a queue entry and adds the five friends they have authority over.

### 4.7 Playing the game

1. **Form teams.** While the game is open, players join Team A or Team B, or are added by friends with authority.
   - A **full team** is 6 indoor or 2 beach.
   - Short-handed games are allowed, for example 5v5, and `M` is based on the players actually in the game.
   - Once both teams are full, new arrivals go to the queue.
2. **Start game.** Any player on a team taps **Start game**. This needs at least one player on each side. Both teams are snapshotted as the rated roster, and team rosters lock.
3. **End game.** When play is over, any single player on a team taps **End game** and picks the result: **A wins**, **B wins**, **Tie**, or **Did not finish**, with set scores optional.
   - There are no restrictions on when a game can be ended.
   - The result **stands by default**. Every account that played is notified of the result ("Team A won — recorded by Sam"), and anyone who disagrees can dispute it (§5).
   - The **next game** on the court is created immediately (4.8).

### 4.8 Next game on the court (rotation rules)

When a game ends, the court chain moves on. The new game inherits the location, court #, format, code, and **court rotation** setting, with a start time of "now".

**Terms:**
- The **holder** is the team that has been on the court longer.
- The **challenger** is the team that most recently came on.
- In the first game of a chain, Team A is treated as the holder and Team B as the challenger.

**The creator picks the court rotation when creating the game, and it is locked like every other detail:**

| Setting | How it works |
|---------|--------------|
| **Win cap 2** (default) | Winner stays on, up to **2 straight wins**. A team that reaches its 2nd straight win comes off, along with the team it just beat, and the next **two** teams in the queue play. |
| **Win cap 3** | Same as above, with a cap of **3 straight wins**. |
| **No limit** | Winner stays on for as long as it keeps winning. |
| **Rotation (no king of the court)** | Every team plays **at most 2 games in a row**. The first two teams play, and the winner stays for one more game. After that, the **holder** comes off after every game, **whatever the result**, and the challenger stays. One team is always cycling off. |

**What happens after each result:**

| Result | Win cap 2 / Win cap 3 / No limit | Rotation |
|--------|----------------------------------|----------|
| **Win** | Winner stays and the loser comes off. If the winner just hit the cap, **both** come off | First game of the chain: winner stays. After that, the holder comes off and the challenger stays |
| **Tie** | **Challenger stays on**, the holder comes off, and the holder's win streak ends | Holder comes off and the challenger stays (the same as any game) |
| **Did not finish** | **Both teams come off**; the next **two** teams in the queue play | Same: both come off |

*Example (Rotation).* Games are T1 vs T2, then T1 vs T3, then T3 vs T4, and so on:
- **Game 1:** T1 beats T2, so T1 stays.
- **Game 2:** T1 plays T3. T1 has now played 2 games in a row, so T1 comes off whatever the result, and T3 stays.
- **Game 3:** T3 plays T4. T3 comes off after this one, and T4 stays.

**Win streaks** belong to the team that stays on, even if it subs players between games (see 4.8.1). A tie or DNF never counts as a win.

- **Coming off:** players who come off are released.
  - Their team gets a one-tap **Requeue together** button, which adds them as a full entry at the **back** of the queue.
  - Individuals can requeue on their own.
- **Short queue:** if the queue can't fill both sides, any open slots stay open in the new game for anyone to join. With an empty queue after a win, the winners wait in an open game for challengers. If they all leave and nobody is queued, the chain ends.
- **Disputes later:** the court moves on based on the recorded result, at the moment End game is tapped. A later overturn changes ratings and dishonesty points, but not who played next.

#### 4.8.1 Players leaving a team that has the court

Between games, the next game is **open**, so anyone on the team that stayed on can leave, even right after winning. What happens depends on how much of the team leaves, counted against the roster that played the last game:

| Players who leave | Result |
|-------------------|--------|
| **More than half** (indoor: 4–6 of 6; beach: 2 of 2) | The team **loses its court rights**. The players who stayed are released, and can **Requeue together** at the back of the queue as a forming entry. Their slot is filled from the queue using the standard picker (4.9). The win streak ends. |
| **Half or fewer** (indoor: 1–3 of 6; beach: 1 of 2) | The team **keeps the court** and gets the **standard 3-minute fill window** to refill. Anyone can join the open spots, including individuals in the queue. |

When a team's 3-minute fill window ends:
- **Refilled:** they play, and the win streak continues.
- **Still short, and a ready team is waiting:** the ready team takes their slot. The short team becomes a forming entry at the **front** of the queue, so it moves back one slot, the same as any forming entry (4.9).
- **Still short, and no ready team is waiting:** they keep the court and play short-handed.

The same rule applies to a team that was **just called** from the queue, if its players leave before the game starts.

When both a team on the court and the front queue entry are short, their 3-minute windows run **at the same time**. Start game becomes available once both sides are settled.

### 4.9 The queue

Teams and individuals line up to play the winners. The queue is **first come, first served, with priority for full teams**.

**Queue entries:**
- An **entry** is a team-in-waiting with a name ("Jackson's squad"), its members, and the time it joined the queue.
- Its position is set by **when the entry was created**, not when its last member joined.
- An entry is **ready** when it has a full team: 6 indoor, 2 beach. Otherwise it is **forming** (for example "4/6 — needs 2").
- **Full teams** join as one entry in a single step. One player creates the entry and adds friends they have authority over; the others join it through the game code.
- **Individuals** can join any forming entry with room, or start a new one. The game page highlights the forming entry closest to the front, to help short-handed groups fill up.

**Picking the next team when a game ends:**
1. **Front entry ready?** Then it is called immediately.
2. **Front entry still forming?** Then a **3-minute fill window** opens.
   - Every forming entry ahead of the first ready entry can recruit during the window. The game page and nearby players see "Riley's team needs 2 — join now."
   - If the front entry fills, it is called at once.
3. **The window closes and the front entry still isn't full.** The **first ready entry** behind it is called. Every forming entry that was ahead **keeps its order but moves back one slot**, behind the team that was called.
4. **No ready entry at all, even after the window.** The front forming entry gets the court and plays short-handed ("Play 4v6?"). It can pass, and then the court goes to the next entry.
5. **When two teams are needed** (both teams came off after a capped win or a DNF), run the same steps a second time for the second slot. Both picks share the same 3-minute window.

**3 minutes is the standard fill window** everywhere in the app: for forming queue entries, and for teams on the court that lost players (4.8.1). The court is idle for at most 3 minutes, and only when a team is short.

**Example (indoor).** While Game 1 is being played, the queue fills up in this order:

| Joined queue | Entry | Size when Game 1 ends |
|--------------|-------|-----------------------|
| 7:05 | **Riley** (solo; recruiting) | 4/6, forming |
| 7:10 | **Spikers** (full team) | 6/6, ready |
| 7:20 | **Mo's group** | 6/6, ready |

When Game 1 ends:
- Riley's entry is first but not full, so **Spikers** play the winners.
- The queue becomes **Riley → Mo's group**.

When Game 1 ends, Riley is at the front with 4/6, so a 3-minute fill window opens:
- If two more players join Riley's entry within the window, **Riley** plays the winners.
- If not, **Spikers** play, and the queue becomes **Riley → Mo's group**.

When Game 2 ends, Riley gets another 3-minute window. If Riley still isn't full, Riley moves back again and Mo's group plays next. Riley always stays in line ahead of anyone who joined after 7:05.

**Being called:**
- Members of the picked entry get a push notification: "You're up on Court 3."
- They are placed on the open team of the new game, which then starts normally (4.7).
- Members of other entries keep their spot.

---

## 5. Results, Voting, and Dishonesty Points

Results are self-reported. The result recorded by whoever ends the game is **final unless someone disputes it**. Honesty is enforced by the players themselves, with a private **dishonesty score** that flags repeat offenders.

### 5.1 Confirming and disputing (optional)

**Only the player who ends the game has to do anything.** Their recorded result is the result. Everyone else can act, but doesn't have to:
- **Who can act:** every account holder who played in the game, on either team. Guests and people who were only in the queue can't, and **flagged** players can't (5.4).
- **Choices:**
  - **Dispute:** the player disagrees with the recorded result.
  - **Confirm:** the player backs the result. This is optional, and only matters if someone disputes.
- **The player who ended the game** counts as a Confirm automatically, unless they are flagged.
- **Dispute window:** 24 hours after the game ends.
- **Before it closes:** ratings are not changed. The game shows as *"Team A won · open for disputes for 18h"*, or *"Disputed — 3 confirm, 2 dispute"* once someone disputes.

### 5.2 Resolving the result

When the window closes, let `C` be the number of Confirms (including the ender's automatic one) and `D` the number of Disputes.

| Outcome | Condition | What happens to the result | Dishonesty points |
|---------|-----------|----------------------------|-------------------|
| **Unchallenged** | `D = 0` | The result stands as recorded | None |
| **Result stands** | `D ≥ 1` and `C ≥ 2 × D` | The result stands as recorded | **+1** to every player who disputed |
| **Result overturned** | `D ≥ 1` and `D ≥ 2 × C` | The game is **voided** (unrated) | **+1** to every player who confirmed, including the player who ended the game |
| **Split** | Neither side has 2× the other | The game is **voided** (unrated) | **+0.25** to **every player who voted**, on both sides |

What "the result stands" means:
- For a win or tie, ratings are applied.
- For a DNF, nothing is rated.

Notes:
- **The usual case:** almost every game is *Unchallenged*. One tap on End game is the whole process.
- **Flagged ender:** a flagged player's recorded result still stands if no one disputes. But they get no automatic Confirm, so a single dispute overturns it (`D = 1 ≥ 2 × 0`).
- **Disputing a DNF:** if a losing side calls a finished game a DNF to dodge a loss, the other side can dispute it. Overturning a DNF still leaves the game unrated, because the vote doesn't pick a replacement result, but the player who ended it gets a dishonesty point.
- Examples:
  - 6 confirm, 3 dispute: the result stands, and the 3 disputers each get 1 point.
  - 2 confirm, 5 dispute: the result is overturned, and the 2 confirmers each get 1 point.
  - 4 confirm, 3 dispute: split, and all 7 voters get 0.25 each.
- Players who don't vote get 0 points, but the game still counts toward their game totals (5.3), so playing honest games lowers their averages.
- **Rating timing:** ratings are applied when the vote resolves, in order of game *start time*. A game that resolves late triggers a recalculation of any later games for the affected players, run as a background job.
- **Minimum to be rated:** each side still needs at least one rated player (3.2). Otherwise the game is recorded but unrated, and the vote is skipped.

### 5.3 Dishonesty score

Each player has a private running record of points earned per game. Two averages are tracked:

```
Lifetime average  = total dishonesty points ÷ total ended games played
Recent average    = points in the last 10 ended games ÷ min(10, games played)
```

- "Ended games played" means games the player was on a team for that reached ENDED, whether or not they voted. Games that closed without a result don't count.
- Points are **private**: only the player (on their own settings page) and admins can see the actual numbers.

### 5.4 Flag

A player is **flagged** if **either** average is over its threshold:

| Measure | Flagged when |
|---------|--------------|
| Lifetime average | **> 0.15** |
| Recent average (last 10 games) | **> 0.20** |

While flagged:
- A **"Flagged — disputed results"** badge appears on the player's public profile and next to their name in game rosters. The underlying numbers are never shown.
- They **cannot confirm or dispute** results, and their End game result gets no automatic vote.
- They can still join, play, end games, and be rated.

The flag is **recalculated after every game they play resolves**. It clears **automatically** as soon as **both** averages are back at or under the thresholds. There is no manual appeal in v1; an admin can clear a flag that is clearly a mistake.

Examples:
- An established player with 50 clean games who loses one dispute is at lifetime 1/51 ≈ 0.02 and recent 1/10 = 0.10. They are **not flagged**.
- Two lost disputes in the last 10 games put their recent average at 0.20, which is not over 0.20, so they are **not flagged**. A third makes it 0.30, and they are **flagged**. The flag clears once enough clean games push those points out of the 10-game window, provided their lifetime average is also ≤ 0.15.
- New players are protected by **strikes** (5.5). Without them, one lost dispute in a player's first game would put their lifetime average at 1.0.

### 5.5 New-player strikes

Every account starts with **2 strikes**. A strike forgives a mistake while the player learns how the system works.
- **Using a strike:** any time the player **would** receive dishonesty points, strikes are used **instead**. They receive **0 points** for that game, but the game still counts toward their game totals.

| Incident | Would have been | Strikes used |
|----------|-----------------|--------------|
| Result overturned, or lost a dispute | 1 point | **1 strike** |
| Split vote | 0.25 points | **½ strike** |

- **Only ½ strike left:** the remaining ½ strike forgives the next incident completely, even a full-point one. After that, the player has no strikes.
  - *Example:* two splits and one lost dispute leave 0.5 strikes. A second lost dispute then uses that last ½ strike, and the player gets 0 points.
- **Warning:** each strike shows a warning screen the player must acknowledge. It explains:
  - what happened in that game and how the vote went;
  - how results, disputes, and the 2× rule work;
  - how dishonesty points and the flag work;
  - how many strikes remain ("1 strike left — next time, penalties apply").
- **After the strikes run out:** penalties apply normally, from the very next incident. There is no further grace, even if it's only the player's third game. Because their game count is low, one penalty will usually **flag them immediately**.
  - *Example:* strikes used in games 1 and 2, then a lost dispute in game 3. Lifetime average = 1 ÷ 3 = 0.33 > 0.15, so they are **flagged**.
- Strikes never come back, and they are used only for dishonesty incidents. Clean games don't use them up.
- The player's settings page shows the number of strikes left, next to their private dishonesty averages.

### 5.6 Other abuse limits
- Rated games between the same group of accounts are capped per day.
- Repeat-pairing patterns are flagged for an admin.
- Any participant can report a game to an admin, for example for organized vote brigading.

---

## 6. Player Profiles

| Field | Required | Notes |
|-------|----------|-------|
| Full name | Yes | Shown on rosters |
| Username / nickname | No | Unique if set; used in URLs and search |
| Profile picture | No | Cropped and resized on upload; default avatar otherwise |
| Indoor rating | Auto | Starts at 1500, provisional badge until 15 indoor games |
| Beach rating | Auto | Starts at 1500, provisional badge until 15 beach games |
| Social handles | No | Instagram, TikTok, X; stored as handles and rendered as links |
| Home location(s) | No | Used for "near me" defaults |
| Preferred positions | No | Setter, OH, MB, etc. (indoor); defender/blocker (beach) |
| Flag badge | Auto | Shown only while flagged (5.4); dishonesty points are never public |

Profile page sections:
- Both ratings side by side, each with its own history chart.
- W–T–L record for each format.
- Recent games.
- Upcoming games.

**Privacy:** profiles are public by default, with an option to hide social handles or upcoming games. A player's own settings page shows their dishonesty averages, how close each is to its threshold, and which games added points.

### 6.1 Friends
- **Add friend** by searching name or username, from a profile page, or by scanning a player's **profile QR code**.
- A friend request must be accepted. Either player can unfriend at any time, which also removes their authority.
- **Suggestions:** "You've played 5 games with Sam — add as friend?"
- **Friend authority:** the setting is described in 4.6. It defaults to **Nobody — always ask me**.

---

## 7. Data Model (initial)

```
User
  id, email, full_name, username?, avatar_url?, bio?,
  instagram?, tiktok?, x_handle?, created_at, is_admin,
  authority_policy (nobody|all_friends|selected),  -- default: nobody
  is_flagged, flagged_at?,                         -- derived from DishonestyPoint; cached
  strikes_remaining (numeric, default 2.0; decrements by 1 or 0.5)

Rating                      -- exactly two rows per user: indoor + beach
  user_id, format (indoor|beach), rating, games_played,
  wins, ties, losses, is_provisional, updated_at
  (PK: user_id + format)

Friendship
  user_low_id, user_high_id, requested_by,
  status (pending|accepted), created_at, accepted_at?
  (PK: user_low_id + user_high_id, ordered so each pair is stored once)

FriendAuthority             -- allowlist used when authority_policy = selected
  user_id (the one being managed), authorized_friend_id
  (PK: user_id + authorized_friend_id)

Location
  id, name, address, lat, lng, formats[], court_count?, notes,
  status (pending|approved), created_by

CourtChain                  -- the run of back-to-back games on one court
  id, location_id, court_number?, format,
  rotation (cap_2|cap_3|no_limit|rotation),        -- set by creator, immutable
  join_code (unique among active chains),
  status (active|ended), created_at, ended_at?

Game                        -- scheduling fields IMMUTABLE after insert
  id, chain_id, chain_position, location_id, court_number?, format,
  scheduled_start, skill_label?, series_id? (weekly repeats),
  created_by (history only; null for auto-created next games),
  holder_side (A|B), holder_win_streak, holder_games_in_row,   -- drive rotation rules
  fill_window_ends_at?,                                         -- standard 3-min window (queue entry or short court team)
  holder_roster_snapshot (prev game roster; for counting departures under 4.8.1),
  status (open|started|ended|closed_no_result|vanished),
  started_at?, started_by?, ended_at?, ended_by?,
  result (A|B|tie|dnf)?, set_scores (json)?,
  vote_status (open|unchallenged|stands|overturned|split|skipped)?,
  vote_closes_at?, rated (bool),
  coverage_multiplier?, team_rating_a?, team_rating_b?, alpha?,
  created_at

GameMember                  -- team membership in a game (lobby while open)
  game_id, user_id? (null for guests), guest_name?,
  side (A|B), joined_via (created|discover|qr|code|link|added|invite_accepted|
                          guest|stayed_on|called_from_queue),
  added_by?, joined_at, left_at?, removed_by?

QueueEntry                  -- a team-in-waiting on a court chain
  id, chain_id, name, created_by, queued_at (sets position),
  status (waiting|offered|called|declined|left),
  offered_at?, called_into_game_id?

QueueEntryMember
  entry_id, user_id? (null for guests), guest_name?,
  added_by?, joined_at, left_at?

MemberEvent                 -- audit trail for adds, moves, and removals (teams and queue)
  id, chain_id, game_id?, entry_id?, target_member, actor_id,
  action (add|move|remove|leave), from?, to?, created_at

GameInvite                  -- when the friend's policy requires asking
  id, game_id, entry_id?, inviter_id, invitee_id, suggested_side?,
  status (pending|accepted|declined|expired), created_at

GameComment
  id, game_id, user_id, body, created_at

GameParticipant             -- roster snapshot taken when the game STARTS
  game_id, side (A|B), user_id? (null for guests), guest_name?,
  rating_before?, effective_rating?, expected_score?,
  k_factor?, delta?, rating_after?

ResultVote
  game_id, user_id, vote (confirm|dispute), is_auto (ender's vote),
  created_at
  (PK: game_id + user_id)

DishonestyPoint             -- one row per player per resolved game they played
  user_id, game_id, points (0 | 0.25 | 1), reason (lost_vote|split|struck|none),
  would_have_been? (points forgiven by a strike), strikes_used? (0.5 | 1),
  created_at
  (PK: user_id + game_id)

RatingHistory
  user_id, format, game_id, rating_before, rating_after, created_at

Notification
  id, user_id, type (added_to_game|added_to_queue|game_invite|friend_request|
                     youre_up|fill_window|short_handed_offer|result_recorded|disputed|vote_result|
                     strike_warning|flagged|unflagged|...),
  payload (json), read_at?, created_at
```

Implementation notes:
- **Locking game details:** a database trigger rejects updates to the scheduling fields (`location_id`, `court_number`, `format`, `scheduled_start`, `skill_label`), not just the UI.
- **Vanishing:** a leave handler checks, in the same transaction, whether an `open` game has no team members and its chain has no waiting queue entries. If so, it marks the game `vanished`, ends the chain, and frees the code.
- **One active spot per player:** enforced with a partial unique index across active team memberships (games in `open` or `started`) and active queue memberships.
- **Permission checks, done on the server for every add, move, or remove:**
  1. Is the actor in the game or the queue?
  2. Does the actor have authority over the target? Either the target's policy is `all_friends` and they are friends, or the policy is `selected` and the actor is on the allowlist.
  3. Do the timing rules allow it? Team changes need the game to be `open`; queue changes are always allowed.
- **End game is one transaction**, under a row lock on the chain. It:
  1. records the result;
  2. releases the losers (the holder on a tie; both teams on a DNF or a capped win);
  3. runs the queue picker (4.9);
  4. creates the next game, with the winners and the called entries placed on teams;
  5. sends the "You're up" notifications.

  The first End game wins, so two simultaneous taps can't record two results.
- **Rotation rules:** a pure function, `nextOnCourt(rotation, holder, challenger, result, streaks)`. It returns who stays and how many slots open (0, 1, or 2).
- **Queue picker:** a pure function, `pickNext(entries, slots, teamSize, windowExpired)`. It returns the called entries and the new queue order.
- Both pure functions are unit-tested apart from the database.
- **Fill window:** when the front entry is forming, or a court team loses players but no more than half of them, set `fill_window_ends_at = now + 3 min`. A departure of more than half removes court rights immediately.
  - A delayed job runs the picker when the window closes.
  - If the front entry fills sooner, a join handler runs the picker early.
- **Writing a DishonestyPoint row** for every participant (including 0s) keeps both averages simple queries:
  - lifetime: `AVG(points)`;
  - recent: `AVG` over the last 10 rows by game start time.
  Recompute `is_flagged` in the same transaction that resolves the vote.
- **Explaining changes:** store `alpha`, `effective_rating`, and `expected_score` so a player can see *why* they gained or lost what they did. The game page should show "You were expected to win 91%."

---

## 8. Tech Stack (proposed)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js (App Router) + TypeScript** | One codebase for pages and API, good SEO for public game pages |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, mobile-first |
| Database | **PostgreSQL** (via Supabase or Neon) | Relational data, transactions for rating updates, triggers for immutability |
| ORM | Prisma or Drizzle | Typed queries and migrations |
| Auth | Supabase Auth or Auth.js | Email magic link, plus Google/Apple sign-in |
| File storage | Supabase Storage or S3 | Profile pictures, location photos |
| Maps | Mapbox or Google Maps | Location pins, distance filtering |
| Realtime | Supabase Realtime (or Pusher) | Game page updates live as people join, leave, swap, start, and end |
| QR | `qrcode` (generate) + phone camera / `BarcodeDetector` (scan) | Join-by-QR; no special app needed |
| Background jobs | Cron / queue (Vercel Cron, Inngest) | Vote closing, auto-close of abandoned games, recalculation, weekly repeats |
| Hosting | Vercel | Simple deploys |
| Testing | Vitest (unit) + Playwright (e2e) | The Elo engine and the vote resolver need thorough unit tests |

Two parts should be pure, framework-free TypeScript modules with complete unit tests. Both are easy to tune and to re-run for recalculations:
- **Elo engine** (`lib/elo/`): takes two rosters (ratings, or `null` for guests), the result (A/B/tie), and config (`α`, K tiers), and returns per-player changes. A DNF never reaches the engine.
- **Vote resolver** (`lib/votes/`): takes the votes and returns the outcome and per-player dishonesty points. It also computes the flag from a player's point history.

---

## 9. Milestones

### Phase 0: Setup
- Repo, Next.js scaffold, database, auth, CI (lint, type check, tests).

### Phase 1: Accounts, profiles, friends
- Sign up / log in.
- Profile edit (name, username, avatar upload, socials).
- Public profile page showing both ratings.
- Friend requests, profile QR, and the **Who has authority over me** setting with its allowlist.

### Phase 2: Games (MVP core)
- Locations (create, approve, list, map).
- Create a game (location, court #, start time), with scheduling fields locked in the database and an optional weekly repeat.
- Discover feed with filters; game page with live teams, the queue, comments, and .ics export.
- Join via Discover, QR code, short code, or link, including the sign-in-then-return flow.
- Friend authority: add, move, and remove across teams and queue entries, with server-side checks, the invite fallback, and notifications.
- Leave game, the vanish rule, and one active spot per player.

### Phase 3: Elo engine
- Pure module covering team averaging, individual effective ratings, the coverage multiplier, K tiers, and win/tie/loss.
- Unit tests for every example in §3.7, plus edge cases:
  - all players rated, and the maximum number unrated;
  - provisional vs established players;
  - a tie between equal teams (everyone gets 0);
  - an elite player on a weak team;
  - `α = 0` matching the pure team model.

### Phase 4: Start, end, and vote
- Start game (roster snapshot and lock) and End game (record the result and release everyone).
- Court chains:
  - the four court rotation settings (cap 2, cap 3, no limit, rotation), using `nextOnCourt`, with unit tests for every row of the §4.8 tables and the rotation example;
  - challenger stays on a tie; both teams off on a DNF;
  - Requeue together;
  - auto-close of abandoned games.
- The queue:
  - entries, with full teams joining in one step and individuals joining forming entries;
  - the `pickNext` picker, with unit tests for the §4.9 example, all-forming queues, two-slot picks after a capped win, and an empty queue;
  - the 3-minute fill window, including the early call when the front entry fills;
  - court-holder departures (§4.8.1): the more-than-half and half-or-fewer cases, the refill window, and the fallback to the front of the queue;
  - "You're up" push notifications.
- Optional confirm/dispute UI, the 24h dispute-window job, and the vote resolver with unit tests for every row of the §5.2 table and the 2× boundaries (for example 0 disputes, 2 vs 1, 3 vs 2, 0 confirms vs 1 dispute).
- Dishonesty points, both averages, the flag (badge, vote lockout, auto-clear), and the private settings view.
- New-player strikes: 2 per account, with a full strike for 1-point incidents and ½ for splits. Includes the warning screen with system explainer, and an immediate penalty and flag check once strikes run out.
- Rating application in a transaction when a vote resolves, rating history, and a "why did my rating change" breakdown.

### Phase 5: Leaderboards and polish
- Separate global and per-location leaderboards for indoor and beach, plus rating charts.
- Notifications (email/push for invites, adds, votes needed, vote results, flag changes, and game reminders).

### Phase 6: Hardening
- Recalculation for out-of-order vote resolution, abuse detection (vote brigading, repeat pairings), admin dashboard, rate limits.
- Tune `α`, the K tiers, and the dishonesty thresholds against real data.

---

## 10. Open Questions

1. **Rated game minimum:** is "≥ 1 rated player per side" the right bar, or should it be stricter (for example ≥ 50% of the game rated)?
2. **Individual weight `α`:** start at 0.5 for both formats, or use a higher value for beach, where one player is half the team?
3. **Best-of-N:** should a game's result be a single set, or a series (with set scores), and does 2–1 count differently from 2–0?
4. **Exactly half leaving:** the rules said "≥ ½ leave → lose the court" and "≤ ½ leave → refill window", which overlap at exactly half (3 of 6, or 1 of 2 on the beach). The plan gives exactly half the **refill window**, so a beach player whose partner leaves can find a new one. Is that the intent?
5. **Other formats:** support 4v4 grass, 3v3, or reverse coed later? Each would probably need its own rating, so this goes beyond the UI.
6. **Guest removal:** any member can currently remove any guest. Should only the person who added the guest be able to remove them?
7. **Geography:** start with one city or region, and expand later?
