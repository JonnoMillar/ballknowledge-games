# ITK — state of play

**Updated 2026-10-13.** Branch `feat/itk-ship` (cut from `main`, merged
`feat/fake-transfer`), worktree `.claude/worktrees/charming-tesla-f178be`.
Site-wide notes: root `HANDOFF.md`. Spec (the decision record):
`docs/superpowers/specs/2026-10-12-itk-daily-design.md`.

**Process (Jonno, 2026-10-12):** no Superpowers, no plan document. Build
inline from the spec; stop for Jonno only at (1) a review of generated days,
(2) before merging to `main` and pushing (a push deploys).

**Decisions 2026-10-12, and why:**
- Known club by **country**: ≥300k views in UK/ESP/ITA/GER/FRA/MON/NED/POR
  (Wikidata P17), or the old PL-share ≥0.3 rule, or ≥2M views. The handoff's
  0.15-share/1M alternative was measured and dropped: it calls Mohun Bagan
  (0% PL share), Club América, Pachuca, Santos, Mumbai City known.
- First stop **≥2000** (+10 players). 500k player floor kept (Adam 335k failed
  as unknown). Max 9 stops kept (phone). Players ≥5M views excluded (4; too easy).
- Built on v5 rules **without** the v5 playtest; every threshold is a named
  constant in `RULES` (`games/itk/lib/world.ts`).
- **No pattern honours** at launch. **Name: Spoofed** (picked 2026-10-13; rejected
  Paper Talk, Medical, ITK, and passed on Done Deal, Deadline Day, Rumour Mill,
  Here We Go).
- Daily = **committed schedule + cron**, not a pure function of the date:
  past days frozen when rules change, reuse needs history, upcoming days
  readable, 14-day buffer if the cron breaks.

**The game.** Five careers a day. Each is a player's sticker and their clubs as
a trail of crest stickers joined by an ink route, snake-laid. One stop is fake.
Two picks per career: found first time 🟩, second 🟨, missed 🟥, drawn as solid
✓/✓/✕ marks. Share line `ITK #n · Agent 9/10` + grid, no names. One play a day;
progress in `localStorage` `itk.progress.v1`; a reload resumes at the first
open career; a finished day reopens on the end screen.

| Path | What |
|---|---|
| `games/itk/lib/world.ts` | `RULES`, `buildTrail` (loan parents, returns, merges), `buildWorld`: club views, known-club rule, transfer flows, era strength, `candidates` (every rule but portrait) and `eligible` (with a resolved portrait). |
| `games/itk/lib/fakes.ts` | `fakeOptions`: v5 swap/insert candidates and guards, best per kind (loan/mid/late/return/insert). Adds the swap-between-two-marquee guard. |
| `games/itk/lib/day.ts` | `EPOCH`, `composeDay` (bands 20/40/40 taking 1/2/2, LRU within band, gap floor, distinct kinds with fallback, journeyman, insert), `extend`, seeded RNG from the date. `StoredDay.floor` records the reuse gap the day was built to. |
| `games/itk/lib/check.ts` | `problems()`: the promises a day makes; used by the build script and tests. |
| `games/itk/lib/{score,progress,types}.ts` | Marks/ranks/share line; per-date localStorage; wire types. |
| `games/itk/server.ts` | Reads `games/itk/data/days.json`; `playable` (≥ EPOCH, ≤ UTC tomorrow), `loadDay`, `judgePick`. |
| `games/itk/components/` | `Itk.tsx` (fetches the player's local date, the game, Summary), `Trail.tsx`, `Reveal.tsx` (end screen). |
| `games/itk/itk.css` | Stylesheet, prototype rules removed. |
| `app/itk/page.tsx`, `app/api/itk/{day,pick}/route.ts` | Thin shells. |
| `games/itk/data/days.json` | The schedule, one day per line. Server-only. |
| `games/itk/data/club-countries.json` | P17 for the 446 clubs with ≥300k views (`npm run itk:countries`). |
| `games/itk/data/enwiki-views*.json` | 24 months of views (Oct 2023–Sep 2025), moved from `data/itk/`. |
| `scripts/itk/build-days.ts` | `npm run itk:days [-- --print]`: if <14 days ahead, generate to 28 ahead, self-check, write. `--print` shows upcoming days with answers. |
| `scripts/itk/inputs.ts` | Reads the committed inputs (no network). |
| `.github/workflows/itk-days.yml` | Daily 05:00 UTC: `itk:days`, `npm test`, commit `days.json` to `main`. |
| `scripts/fetch-portraits.ts --itk` | Resolves portraits for every ITK candidate (new flag; default run still targets Chain boards only). |
| `public/itk/ranks/*.webp` | Rank art. Credited on `/credits`. |

Removed: set switcher, feedback strip (`Feedback.tsx`), result picker, End
screen jump, Prototype pill, Play again, `content/itk/examples.json`,
`pick-examples.mjs`, `pool-funnel.mjs` (git history has them).

### Status 2026-10-13

Done and verified 2026-10-13: `npm test` 1,686 passed (51 files);
`npm run typecheck` clean. ITK tests (27): trail rules, seeded RNG, bands, every
fake option on the real pool keeps the guards, 90 days from scratch with zero
`problems()`, deterministic rerun, `playable`, no answer on the wire, wrong pick
reveals nothing, committed schedule starts at EPOCH and is consecutive.
Playwright (dev, 375×812): a full day played with mixed results, reload mid-day
resumed at the next open career, end screen card (y 305–550) and Share above the
fold, `scrollWidth` 360 (scrollbar), no console errors, reload of a finished day
shows the end screen. 1100px: round and hub card render; ITK card on `/`.
Onana label fixed (`overrides.ts` + `pool.json`; live label still "Andrcu Onana",
enwiki title André Onana).

**Shipped state 2026-10-13 (name: Spoofed; Jonno's pick):**
- Public surface is `/spoofed`, `/api/spoofed/*`, `public/spoofed/ranks`, share
  line `Spoofed #n · Agent 9/10`, localStorage `spoofed.progress.v1`, hub card
  "Spoofed". Internal id stays `itk` (`games/itk`, `scripts/itk`, `itk-*` CSS,
  `Itk*` types): invisible to players, renaming the dir is churn for no gain.
- `EPOCH` = `2026-09-19` (Day #1), the day Chain's daily launched, so the two
  count days alike and the archive starts with 25 days (backfilled 2026-10-13,
  before anyone had played). Never change it once anyone has played: it
  renumbers everyone's history. `days.json` regenerated from it (to 2026-11-10);
  the cron keeps it 14+ days ahead.
- **Archive:** `/spoofed/archive` (`components/Archive.tsx`) lists day 1..today,
  newest first, with this browser's result per day (local only). A past day
  opens at `/spoofed?date=YYYY-MM-DD` (future or malformed dates fall back to
  today); the API already served any date from EPOCH. Archive plays share
  `Spoofed #n` lines like any other.
- All 229 candidates have a portrait (218 cutout, 10 Commons, 1 none: Zaniolo
  shows the silhouette). `fetch:credits` refreshed.
- Verified: `npm test` 1,686 passed, typecheck clean, `next build` (prod)
  clean; Playwright on the prod server with the clock set to 2026-10-14: full day
  played at 1100 and 375, end screen "Spoofed #1", Share above the fold at 375
  (not at 1100×800: scroll), `scrollWidth` = viewport (scrollbar), no console
  errors, reload of a finished day shows the end screen, hub card present,
  rank art and credits OK, `/itk` is 404.

**Not done:** nothing blocking. Shipped to `main`/Vercel 2026-10-13; live check
passed (hub → `/spoofed` → day #25, five careers, archive, pick API). Next is
Jonno's hub polish (`components/Hub.tsx`, `src/games.ts`) in a new session.
Known limits: careers snapshot 2026-09-20 (January window stales some
   careers; refresh in the cron before Feb 2027); views snapshot Oct 2023–Sep 2025.

**Lobby (2026-10-13, on `feat/itk-ship`, awaiting Jonno's look; not merged):**
`/spoofed` is now a lobby (`components/Lobby.tsx`); the game moved to
`/spoofed/play` (`?date=` for past days); `/spoofed/archive` redirects to the
lobby, whose lower half is the archive (a sideways shelf on a phone, a grid on
a desk). One album page, one red button, four states: never played (headline
"One move never happened", a 7 s CSS demo with invented crests: the marker
circles one, it peels, the real one is underneath; Play); today not started
(five empty slots, Play); part played (finished careers stuck in their slots
with their marks, Continue); done (your rank card, the five, "Next in Xh Ym",
and `Play #n` for the newest unfinished past day, or no red at all). The game
masthead lost Archive and All games: the brand goes back to the lobby.
Verified: typecheck, `npm test` 1,695, Playwright 375 and 1100 for all states
(fixtures set in localStorage), Play → game, `?date` → #24, archive redirect,
no console warnings. Not done: prod build, real play-through from the lobby.

**Lobby round 2 (2026-10-14, Jonno's feedback):** the page now says it is the
daily: tab `Daily #n`, button `Play today's daily` / `Continue today's daily`.
Headline `Can you spot the spoof?`, sub-line `One of these moves never
happened.` The demo is a real career laid out like the game (three a row,
snaking): Ronaldo, Sporting 2002 → Man Utd 2003 → Real Madrid 2009 → **PSG
2018** (fake; peels to Juventus) → Man Utd 2021 → Al-Nassr 2023
(`demoCareer()` in `server.ts`). Ronaldo is over `RULES.playerMax`, so he is
never in a day and the demo spoils nothing; his sticker wears Man Utd red.
Jonno rejected invented crests ("use real examples", clubs the viewer is
comfortable with, a player that gives confidence). The archive is folded
behind an `Archive` button (`<details>`). Sporting CP's `crestUrl` in
`data/clubs.json` was dead (Commons renamed the .svg to
`Sporting_Clube_de_Portugal_2026.png`); fixed by hand. Other crest URLs may
have rotted the same way: not audited.

**Gotchas found this session:**
- **Vercel only bundles files it can trace.** A file read with `readFile` at
  runtime must be listed in `outputFileTracingIncludes` (`next.config.ts`) or
  production 500s with ENOENT while local and `next start` work. Hit with
  `days.json` (live, broken ~2 h, 2026-10-13); a test now guards it. After any
  push that adds a runtime-read file, check the **deployed** API
  (`https://football-chain.vercel.app/api/spoofed/day?date=<today>` → 200).
- `git mv` of a whole directory fails on Windows ("Permission denied") when a
  watcher holds it: move the files individually.
- `next build` rewrites `tsconfig.json` (`.next-prod/types`): `git checkout
  tsconfig.json` before committing. Playwright `page.screenshot` paths land in
  the main checkout's root, not the worktree.
- `data/raw/` is gitignored and absent in worktrees; `fetch-portraits` needs it.
  Here it is a junction to the main checkout's `data/raw`.
- `TaskStop` on Windows kills the shell, not the `tsx` child: check
  `Get-CimInstance Win32_Process` for strays (two fetches once wrote one file).
- An unscoped `fetch-portraits` run targets 3,639 players (every Chain and Deep
  Cuts field is unresolved). ~25 non-ITK players were resolved by a stray run;
  harmless, and `fetch:credits` picks them up.
- Pool drift changes the reuse floor; that is why each day stores its `floor`
  and the schedule test checks only days not yet played.
- Playwright `run_code` screenshot paths don't land in the worktree; use the
  `browser_take_screenshot` tool. `.playwright-mcp/` is gitignored.
- Known limits (follow-ups): careers snapshot 2026-09-20 (January window will
  stale some careers; refresh in the cron recommended before Feb 2027); views
  snapshot Oct 2023–Sep 2025.

### Prototype history (rules and why; still current)

**Reveal.** A *swapped* fake peels off from the corner (lift, shade, pulled away
up-left) to show the real club stuck underneath; green frame, green legs, the
fake's crest small and struck through. An *inserted* fake peels off to an empty
hatched space; legs go faint and dashed. A wrong pick: grey loop + green tick.
Hover: red marker loop draws round the card. No stamps, no shakes — Jonno: "if I
see a tacky animation for right or wrong I'll be angry."

### End screen — decisions (2026-10-09/10) and why

- **Ranks (flat 2/1/0 points, 0–10):** podium **Fabrizio 10 · Agent 9 · Scout 8**
  (gold/silver/bronze, Deep Cuts metal cases), then plain bands **Pundit 5–7 ·
  Casual 2–4 · Mascot 0–1**. Jonno picked every name. He chose flat scoring over
  ramp-weighted (which gave 39 outcomes) and rejected 15 named rungs: low scores
  are all poor, so they get grouped bands. "Fabrizio" by name is his call (I
  flagged likeness/trademark risk; he accepted). Rejected: Season ticket (too
  rewarding), Flawless as top (I argued generic; 10/10 says it), Pundit-below-
  Season-ticket ordering ("misleading and subjective").
- **Titles 1–2 words, no jokes or quote lines** (they get annoying on repeat).
- **Stamp is gone** ("cheap and crappy"). **Pack and peel are out**: they unwrap a
  mystery, but you already know how you did. Direction = **album + tally**.
- **Marks (Jonno is colour-blind):** keep green/yellow/red for recognition, add a
  symbol: **solid green + white ✓, solid yellow + white ✓, solid red + white ✕**.
  He rejected numbers ("2" misreads as "got it on the second go") and double
  ticks. If the white ✓ is faint on yellow at 22px, deepen the yellow slightly;
  don't change the mark. Applies to top-bar pips, status chip, end screen.
- **Art per rank** ("white feels empty, not a reward"): six images in
  `public/itk/ranks/`, made with a game screenshot as the style reference.
  Lesson: **always pass a reference image** for colour/feel (Jonno called the
  unreferenced Recraft test "terrible planning"); Recraft V4.1 takes none. Cost
  4.25 credits total. The Casual scarf is green/yellow (≈ Norwich); Jonno
  kept it as is (2026-10-10), don't regenerate.
- **Not yet answered:** pattern honours (Late show, Bottled it, Second call…).

### End screen — built (2026-10-10), awaiting Jonno's sign-off

Known: on a 375×812 phone the card's lower half starts below the fold, because
the prototype bars (set switcher, result picker) push it down; recheck once
they're removed before ship.

What's on screen, in order of the animation (route 350ms → card 2050ms, actions
2550ms, album 3050ms): `ITK #n` and a counter over the five careers; the ink
route runs through their ✓/✕ marks, each mark's `+2/+1/+0` pops as the route
passes and the counter steps to the running total; the route drops into **your
card alone, large and centred** (220px, 184px on a phone: full-colour art, name,
`8/10`; podium in its metal case), landing with a press; Share / Play again
under it; only then the album page of all six fades in below (yours stuck in
its slot; the rest faded + greyed art, name, point range `0–1`…`10`). Jonno
(2026-10-10): "you got this, then you see the others". Phone: the podium is the
first row of three. Pack/peel mockups and the reveal switcher are deleted. Still prototype: the "End screen" jump and the result picker.
White ✓ on `--gold` checked at 22px: readable, yellow left as is.

### Rules learned from playtests — and why (do not re-litigate)

Four playtest rounds (v1–v4; v5 not yet played). His verdicts drove each rule:

- **Fame is English Wikipedia views, not sitelinks.** Player floor 500k views/24mo.
  Sitelinks let in Doyle (26k), Mucha (14k), McCarthy, Adam: "who even is he?"
- **Every stop must be a club a British fan knows; at most one exception.**
  Known = ≥300k views AND ≥30% of its pool players also played in the PL, OR
  ≥2M views. Views alone fail: Pachuca, Vissel Kobe ≈ Blackpool.
- **No old careers.** First stop ≥2004, median stop year ≥2008, still playing
  ≥2015. Keane, Lineker, Hoddle, Speed: "history, not memory".
- **No giant fakes, no fake bigger than the career's median club.** Mata→Arsenal,
  Ramos→Milan, Pedro→PSG were instantly false: that move would have been news.
- **Never put the fake between two marquee moves** (Ronaldo, Courtois, Kroos
  rated "extremely easy").
- **Never touch a spell fans remember:** signature club, any ≥8M-view club, any
  spell of 50+ games (a draft swapped Isak's Newcastle, Bale's Spurs).
- **Mix swap and insert, unannounced.** v4 swapped only: easier, deducible, and
  short careers became guessing ("when there's so few clubs, add one sometimes").
  Short careers (≤5) get an insert 60% of the time, never always (a fixed rule
  is a tell — inserts kept landing in round 1).
- **A different kind of fake each round** (loan, mid, late, one spell of a club he
  had twice, insert). v4 repeated the early-loan swap: "predictable if you spam it".
- **Photo guard:** never swap the spell the photo was taken in (Walcott's photo
  was at Everton, the swapped-out club). Year from filename or Commons metadata.
- **Fakes must fit the era:** ≥4 pool players started at the fake club within ±2
  years (a draft gave Kroos an RB Leipzig loan in 2010).
- **Show loan returns and loan parents.** Courtois read Chelsea → Atlético (loan)
  → Real, hiding his Chelsea return; Harry Wilson showed loans with no Liverpool.
- **Display names from the enwiki title** (Marc Guiu, not "Marc Guiu Paz").
- **Fun ≠ difficulty.** Ease 9–10 scored fun 2–3; ease 3–5 scored fun 6–7. The best
  moments are a *real* stop that shocks ("Brentford got me", Szczęsny at
  Brentford) next to a believable fake. Journeymen/loan armies are a *flavour*,
  not a difficulty slot (Jonno pushed back hard on slotting "journeyman" between
  medium and hard). Day = a difficulty ramp + a mix of flavours.
- **Exclude anyone he has already played** (list in `pick-examples.mjs`, `PLAYED`).

### Why only ~125 players passed v5 (measured 2026-10-12; superseded by the country rule above)

Funnel at the v5 rules: 688 players with 500k+ views, 497 with 4–9 stops and
crests, 356 after the era rule, **125 after the known-club rule**. The
known-club rule is the one that bites (225 players lost): "≥300k views AND ≥30%
of the club's pool players also played in the PL, or ≥2M views" calls Sevilla,
Lyon, Porto, Valencia, Monaco, Werder, Fiorentina, PSV, River Plate unknown,
because they are Spanish/French/Portuguese clubs with a low PL-link share. Views
alone cannot replace it (Vissel Kobe 651k, Al-Nassr 580k ≈ Blackpool 681k,
Werder 694k). Sweep (players that pass): 125 baseline; share 0.15 + "huge" at
1M views instead of 2M → **249**; + first stop ≥2000 → 260; + player floor 350k →
306; + up to 10 stops → 319; allowing 2 unknown clubs → ~440 (probably too loose).
Jonno's calls still needed: the club rule, the 500k floor (Adam 335k was
rejected as unknown, Pellistri 578k and Coady 588k were fine), the 2004 start.
**Reuse:** same player with a different fake is fine after a gap; no repeat if
the gap is shorter than players/5 days (250 players → 50 days; 320 → 64). A
player who recalls the real career spots a new fake faster, so keep the gap long
and never reuse the same fake club for the same player.

### Verified (prototype, 2026-10-09/10)

2026-10-10, end screen: `npm test` 1,373 passed (36 files); typecheck clean.
Playwright frames at 1100px and 375px for Fabrizio, Agent, Scout, Pundit, Mascot
at 700/1400/2150/2400/5000ms: no console errors, `scrollWidth` = viewport. A
real pick checked the ✕ on the top-bar pip and status chip. Fixed on the way:
the metal case overflowed its slot by 14px (`.slab` is a column flexbox; the
paper needed `min-height: 0`). Scratch script pattern: `npx` playwright from
`npm-cache/_npx/9833c18b2d85bc59`, `executablePath` = `ms-playwright/chromium-1228`
(its bundled revision isn't installed); first `/itk` compile takes ~20s, warm
it with curl before running.

2026-10-09 (commit 8f2ef2e):

`npm test` 1,370 passed (36 files); `npm run typecheck` clean. v5 checked in a
browser (Playwright, 1100px and 375px): swap peel (Maguire), insert peel
(Mount), missed round, no horizontal scroll. `pick-examples.mjs` reproduces the
committed `content/itk/examples.json` exactly. Pane-browser screenshots are
unreliable here (they crop/zoom); use Playwright for visual checks, and freeze
animations with `document.getAnimations()` + `currentTime` to inspect frames.

### Hazards (still apply)

`.next` corruption: `/itk` 404s with ENOENT on `.next/server/app/itk/page.js`
when another dev server shares the folder; stop the other, restart. An untracked
`AGENTS.md` (copy of CLAUDE.md) appeared from elsewhere: Jonno to say keep or
delete; not committed. The desktop app stops idle dev servers and each restart gets a new port (3000 is
taken); `npm run dev` prints it. The `prod` launch config fails: no build.
