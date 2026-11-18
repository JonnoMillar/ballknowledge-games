# Player photos: decisions and the pipeline to build

Decided with Jonno, 2026-10-20/21, over two test rounds (12 players, then 30
he picked by hand). This is the brief for building it; the prototype that
produced the tests is in `scripts/photos/prototype/` (scratch-quality, paths
assume `.scratch/photo-test/`).

## What production shows today, and why it is wrong

- Cutouts (TheSportsDB) are dev-only: their terms forbid public use. In
  production a player gets a Commons photo, or the grey silhouette.
- `scripts/fetch-portraits.ts` takes the **first** file in the player's Commons
  category whose name has the player's name and whose date is in his career.
  Nothing judges the picture: Ibrahimović got a display of his shirts,
  Ronaldo a crowd shot of him in a suit.
- Career end dates are stale for active players. Messi's span is 2003-2023
  (his last spell, Inter Miami, has no end in `data/careers.json`), so his
  2026 photos count as post-retirement. Rule: a last spell with no `to` (and
  not a loan) means still playing; the span runs to this year.
- Photos are requested 200-400 px wide (`src/server/board.ts`) for stickers
  up to 164 px wide. On a 2.5x screen that is soft. Serve ~2.5x the display
  width.

## Decisions

1. **Hybrid.** A processed Commons photo where a good one exists; a designed
   kit card everywhere else. No agency photos (paid), no TheSportsDB (terms),
   no AI-generated faces (likeness rights, accuracy).
2. **Look: natural colour (A).** The cutout in its own colours on the club's
   colour, as givens are. The two-tone print (B) was rejected.
3. **Every face in one box, body off the bottom edge.** A cutout that ends
   inside the frame "floats" and looks terrible (Jonno). Crop square, head
   about a third of the frame, starting 0.55 face heights above the face;
   pull the frame's bottom up to where the body still fills a quarter of its
   width; keep it inside the photo's sides; reject below 2.3 face heights.
4. **Kit card** (no good photo): `scripts/photos/silhouette.png`, one real
   cutout blacked out (from "Robert Lewandowski 2018, JAP-POL (cropped).jpg",
   Commons, CC BY-SA: credit it), dark at 82% on the club colour, light at
   82% on a dark club colour (luminance < 0.3). The club crest goes **small
   in the top-right corner on a white disc**, never on the shirt (the figure
   is not square-on, so a chest badge never sits right). Crest from
   `public/badges`, never drawn.
5. **Jonno picks along the way.** He offered to; a round of 30 took him a few
   minutes. Use rounds to calibrate the ranking, then to approve the famous
   players' photos.

## The pipeline

1. **Candidates.** Wikidata P18, plus every file in the player's Commons
   category (P373) and its year subcategories inside the career, filtered to
   files with the player's surname (accent-folded) and a capture year inside
   the career (EXIF `DateTimeOriginal`, else `DateTime`).
2. **Gates.** YuNet face detector (`cv2.FaceDetectorYN`, opencv_zoo
   `face_detection_yunet_2023mar.onnx`; OpenCV 5 has no Haar cascades).
   Reject: no face; a second face over half the size of the first; face under
   50 px; under 2.4 face heights of photo below the face top; face sharpness
   (Laplacian variance) under ~80.
3. **Rank** (round 1 tells us how; see below).
4. **Cut out** the winner with rembg `birefnet-portrait` (free, local, ~40 s a
   photo on CPU). Try the next candidate if the crop fails the floating rule.
5. **Store** the result as an image we host (WebP, ~2.5x display width), with
   the Commons file, author and licence in `data/credits.json`: the cutout is
   an adaptation of a CC BY-SA photo, so it is credited and shared alike.
6. **Review.** Famous players (fame 60+, ~390) go through a Jonno pick round
   before shipping. The long tail ships on the ranking, or the kit card.

## Round 1: what Jonno's picks taught the ranking

`scripts/photos/round1-picks.json`: 30 players, up to six candidates shown
each in shuffled order, his pick (27; three had nothing usable).

- The prototype's first choice matched his on 15 of 27; his pick was in its
  top three on 21.
- **P18 must not win automatically.** In 7 of the 12 misses the prototype had
  forced Wikidata's image to the top; he picked something else every time.
  P18 is often the newest photo (2026 internationals) and sometimes blurry
  (Kroos's: sharpness 13). P18 is at most a small bonus.
- **Prime over recent.** Median year of his picks 2013, of the prototype's
  2019. Score a photo by how close it is to the player's prime (e.g. the
  middle of his spell at his signature club, or the middle of the career).
- **Smaller faces are fine, blur is not.** His picks: median face 182 px,
  sharpness 571. The prototype's: 315 px, 407. Cap the face-size reward low
  (~150 px) and weight sharpness more.
- Messi is the exception that proves the rule: his P18 is a sharp 2026
  photo and Jonno preferred it to a 2008 one. Prime-year scoring must not
  bury a clearly better recent photo; sharpness and face size break the tie.
- **No candidates at all:** Fernando Torres (1 in-era file), Gary Lineker
  (1), Hugo Lloris (14, none passed the gates). Look further (more
  subcategories, files without the surname in the name) before the kit card.

## Ranking v2: what the data said (2026-10-21)

`scripts/photos/rank.py` (the score) and `scripts/photos/test_rank.py` (run it
against round 1: `python -X utf8 -I scripts/photos/test_rank.py -v`). The
stored round-1 features gained the face's pose (`yaw`, `roll`, `cx`) from
YuNet's landmarks.

Two of the lessons above did not survive a closer look at the six photos he
saw per player (27 groups, his pick vs the five others):

- **Sharpness does not separate his picks.** His pick beat the other photos on
  Laplacian sharpness 50% of the time, i.e. chance. Picks are as soft as
  anything else shown (Iniesta's is 198, Piqué's 157, Giroud's 127). The
  medians (571 vs 407) are carried by a few very sharp outliers. Kept as a gate
  (~80) and a feather-weight, not a driver.
- **P18 is a good photo more often than the notes suggest.** When P18 was
  among the six (16 players) he picked it 9 times, against 1-in-6 by chance.
  It fails when it is a 2026 photo of an ageing player or an action shot. So
  it carries a moderate weight, not "at most a small bonus" (weights 0.5-2.0
  move the offline score by one pick, so this is not delicate).
- **Prime-year helps only a little** (the pick is nearer the prime in the
  fitted model, but univariately he picked slightly older, not nearer).
- What his picks share, looking at the sheets: tight head-and-shoulders
  framing (face share of the height: he beat 68% of the others), a face that
  looks at the camera, centred, neutral expression, club or national shirt
  visible. His rejects: action shots, full body, thumbs-up and pointing,
  mid-celebration. The detector cannot see expression or gesture.

Result of v2, scored on all candidates (not only the six he saw): **first
13/27, top-3 21/27** (round 1 baseline: 15 and 21). Leave-one-out fit on the
six-photo groups: 12-13/27. Chance is about 5. A kit-colour feature (torso
pixels near the club colour) added nothing. So the ranking is no better than
the old one at first place and the ~22 target is out of reach on these
features: an automatic first pick will agree with Jonno about half the time.
Hence the plan for the long tail: ship the ranking's pick, and for the famous
~390 show him the top three to choose from.

## Round 2 (2026-10-21): v2 on 30 fresh players

`scripts/photos/round2/`: players, every candidate with its features and gate
verdict (`candidates/`), what each page showed (`shown.json`: 5 ranked + 1
gate-rejected, shuffled), and his picks (`picks.json`). Weights were fitted on
round 1 only, so this is an out-of-sample test. The page showed raw Commons
photos, not cutouts: it tests the choice of photo.

- 29 picks, 1 "none good" (Zidane: only 3 candidates, all poor).
- **First place: 14 of 29** (48%); of the 23 picks that had passed the gates,
  14 (61%). **Top 3: 19 of 23.** Round 1 baseline was 15/27 first, 21/27 top 3.
  So v2 is no better than the old ranking at first place and nowhere near
  22/27 (81%). The features are used up: refitting on all 50 groups gives
  28/50 in-sample, 24/50 leave-one-out, and the hand-set weights score the same 28.
- It is solid only where there is a fresh photo. The six players with a 2026
  photo (Neymar, Mbappé, Kane, Yamal, Vinícius, Bellingham): 6/6 first. The other
  17 gate-passing picks (photos from 1982-2019, mostly 2006-2013): 8/17 first.
  The misses are rank 2-5; the old ones are lower resolution and mixed in style.
- **Gates.** He picked a gate-rejected photo 6 times of 29 (shown 29 times,
  once per player): 5 "photo ends at the chin" (Maradona 1978, Baggio 1990,
  Bergkamp 1989, Casillas 2011, van Dijk 2016, face-heights below the face
  1.7-2.0), 1 "two people" (Haaland), 0 sharpness, 0 too-small. So the
  **chin gate is too strict** (floor 2.2 face heights; his picks sit at 1.7-2.0)
  and the sharpness and too-small gates are fine. The catch: a cutout of a
  photo that ends at the chin floats (decision 3), so these are photo picks, not
  cutout picks; for them use the photo uncut on the club colour, or the kit card.
  The "two people" gate cost one pick in nine shown; left alone (361 of 875
  round-2 photos were rejected on it, so it does remove a lot, but one data
  point is not enough to move it).
- Few candidates for the oldest: Cantona 0 in-era files, Baggio 3, Bergkamp 5,
  Zidane 12 (2 usable). Dating by year subcategory (added in `candidates.py`)
  is what lets Maradona's 1970s-80s scans in at all.
- Data quirk: an open-ended last spell is read as "still playing", but some
  retired players have one (Ronaldinho's span now runs to 2026). Harmless
  (it widens the span), worth a manual end year in `data/careers.json`.

Where that leaves the plan: an automatic first pick will agree with Jonno about
half the time and has him in its top three about four times in five. So the
approval round for the famous ~390 shows the top three and he taps one;
everyone else ships on the ranking or the kit card.

Done means: the new ranking hits his pick at least ~22 of 27 on this file
(a test), a round 2 on fresh players confirms it, then the full run.

## Phase 2 status and how to resume (2026-10-26)

Jonno approved the plan after round 2: loosen the chin gate, search harder for
no-candidate players, cut out the ranking's pick for everyone, then an approval
round on the famous players, then publish, merge to `main`, push.

**Built and committed** (branch `claude/photo-pipeline-1d882c`):

- `scripts/photos/rank.py` (score; `NOT_A_PHOTO` filename blocklist: wax
  figures, statues, cards, FIFA renders, TOTS; profile gate `MAX_YAW` 0.8),
  `candidates.py` (gates, features, deep search when nothing usable, chin gate 1.6),
  `cutout.py` (rembg birefnet-portrait, crop, 440 px WebP, `--alts N`),
  `publish.py` (copies the chosen cutouts into `public/portraits/`, rewrites
  `data/portraits.json` as `source: "processed"`), `fit.py`, `pick-all.ts`.
- Site: `PortraitImage.fit` gained `box` (our cutout, cover, bottom-anchored) and
  `kit` (kit card with the club for the crest); `components/Sticker.tsx`
  `KitCard` (no image at all also draws it); `src/server/board.ts` gives every
  pool player without a photo a kit entry; `public/kit-figure.png`; the credits
  page and `scripts/fetch-credits.ts` read `source: "processed"` records and the
  kit figure's photo. Tests: `tests/portraits.test.ts`, `tests/chain/client.test.ts`.
  `tsc` clean and those two test files pass; the full suite and a prod build
  have NOT been run, and the kit card has not yet been looked at in the running app.

**Data in `.scratch/photo-all/`** (gitignored, regenerable but slow; the YuNet
model is `.scratch/models/yunet.onnx`): `players.json` (893 = fame 60+ plus every
board player, famous first), `cand/` (candidates, 120 done), `out/` (cutouts, 24
done). Background jobs die with the Claude session; restart them with:

```
cd .scratch/photo-all
for i in 0 1 2 3 4 5; do python -X utf8 ../../scripts/photos/candidates.py "$(pwd)" players.json $i/6 > run$i.log 2>&1 & done
./drive.sh > drive.log 2>&1 &     # loops cutout.py x2 until every player has out/<id>.json
```

Both skip finished players. Expect hours: the machine is RAM-starved (rembg needs
about 1.5 GB a process; keep it to 2) and a cutout takes 25-60 s.

**Still to do, in order:**

1. Finish candidates and cutouts for all 893 (famous first). Run `candidates.py`
   again for players with 0 usable (Torres, Lineker, Lloris, Cantona): its deep
   search runs automatically when nothing passes, so just check them after.
2. Look at the kit card and a cutout sticker in the running app (`npm run dev`).
3. **Approval round on the famous players** (Jonno): a grid of the 395 cutouts as
   stickers on the club colour; he marks the wrong ones; for those, cut out
   `--alts 3` and show three to pick from or "kit card". Save his answers as
   `choices.json` ({id: k | "photo" | "kit"}).
4. `python scripts/photos/publish.py .scratch/photo-all choices.json`, then
   `npm run fetch:credits` (needs Commons network), then `npx tsc --noEmit`,
   `npm test`, `npm run build`, check `/credits`.
5. Merge `main` into the branch, re-run the checks, merge into `main`, push
   (CLAUDE.md allows this once checks are clean). One line in the root
   `HANDOFF.md` games index is not needed (this is not a game); add a short
   "Portraits" update there at merge.

Caveats to tell Jonno: processed files add roughly 15-25 KB each to the repo
(`public/portraits/`); `fetch-portraits.ts` must not be rerun with `--recheck`
over processed records; players outside the 893 still fall back to the unjudged
`images.json` photo, else the kit card.

## Rescope (2026-10-29): niche cards, grade material, a new kit card

Jonno, through the hub session: "The name of the game is getting niche cards, so you probably
want to see a picture of them. The kit card silhouette is a bad one. I don't like the coloured
kit background, just put the grade material there as well." His choices, which replace the
matching parts above:

1. **Scope: every pool player with a usable photo** (about 9,000, not the 893). Work in order of
   English Wikipedia views (`data/player-views.json`, most viewed first): the 893 picked on fame
   cover ~48% of what players see by views, the top 2,000 by views ~81%. `scripts/photos/pick-all.ts`
   writes the list (`.scratch/photo-all/players.json`; the old 893 are in `players-893.json`).
   Candidates and cutouts are keyed by player id, so earlier work carries over.
2. **Checking: top 500 by hand, the rest on the ranking.** He checks the 500 most viewed in a grid
   (mark wrong, then pick from 3 alternatives or the kit card). Everyone else ships on the automatic
   pick, plus automatic rejects (below), else the next candidate, else the kit card. A dev-only
   "wrong photo" button on a card lets him flag any he meets while playing.
3. **Background: no club colour anywhere.** The grade material goes behind every player (as Steps
   does since a81efba); a card with no grade yet gets plain grey, the same as Steps before the verdict.
   One rule site-wide. This replaces decision 2's "on the club's colour" and the kit card's club ground.
4. **Kit card: redo the silhouette.** The blacked-out Lewandowski 2018 is out. Options go on the dev
   preview page (`/grounds`), on grade material and on grey, for him to pick. The crest stays (from
   `public/badges`, never drawn).
5. **Long tail:** no usable photo means the kit card, not the old unchecked `images.json` photo.
   `cutout.py` no longer keeps an uncut `photo` fallback either.

### Automatic rejects (`scripts/photos/checks.py`)

About 1 in 4 of a random sheet of done cutouts was wrong, in a few repeating ways. Each finished
crop is now checked, a failing one is dropped and the next candidate tried (`rejected` in the
player's `out/<id>.json` says why):

- **CLIP ViT-B/32 zero-shot** (free, local; `Clip` in checks.py): probability that the crop is a
  footballer in a shirt, against suit / casual clothes / mural / wax figure / podium / sign / manager
  in a coat / cartoon prompts. Reject under 0.7. Catches suits, casual clothes, murals, podiums.
- **Edge mass:** alpha in the outer 8% columns of the upper 45% of the frame over 0.05: another
  person or a stray limb beside the head. **Second face** in the cutout over a quarter of the main one.
- **Commons description and categories** with words that cannot be a match photo (mural, statue,
  press conference, ceremony, interview...). Words that can ("visit", "conference") are left out.

Calibrated on the 193 cutouts done by 2026-10-29: 27 rejected (14%). All 18 CLIP rejects in the
sheet I looked at were genuinely wrong (Rashford's mural, Ronaldo at a podium, Romario, Crespo, Villa,
Xabi Alonso, Rijkaard, Gullit, Drogba, Owen, Borissov the politician...); the edge check added Suarez,
Bruno Fernandes, Shearer, Khedira, Hakimi, Depay, Xavi, Laudrup, Bonucci, Dzeko (the last two
borderline, accepted). Not caught: Pogba and Van Dijk (a neighbour's sleeve or head at the frame's
edge below the head level), so the top 500 still need his eyes. A "ghosted" matte (Shearer) is not
a transparency problem: his alpha is solid; it is a washed-out source photo plus an arm, and the
edge check rejects him.

`recheck.py` applies the checks to cutouts made before they existed: failures move to `rej/` and
`bad/<id>.json` tells `cutout.py` to skip that file. `clipcheck.py` is the batch version used to
calibrate. The driver is now `.scratch/photo-all/drive.py` (one cutout process: rembg already uses
every core; run `candidates.py` as 2 processes beside it).

### Speed, and a crash (2026-10-29)

Measured with the checks on: about 50 s a cutout (rembg birefnet-portrait on CPU plus CLIP and the
Commons lookup), one process, so ~12,000 players would take ~170 hours, not 2-3 days. Options, in order:
close other apps and run two cutout processes (RAM is the limit: ~2.8 GB a process with CLIP loaded);
a lighter rembg model (`birefnet-general-lite`, `isnet-general-use`; not yet compared on quality, the
benchmark is `.scratch/bench_models.py`); or cut the scope to the top N by views and kit-card the rest.
DirectML on the RTX 4050 (`onnxruntime-directml`, installed to `.scratch/ortdml` only) failed with
"not enough memory resources" on both adapters while the machine was at ~1 GB free; worth one more
try on an idle machine. **Do not benchmark beside the running jobs:** doing so (four models loaded
at once, on ~1 GB free) crashed the laptop. After a crash, validate `cand/*.json`, `out/*.json` and
the webps (a half-written file), then restart; `candidates.py` and `cutout.py` skip finished players.

**Benchmark result (same day, machine otherwise idle):** birefnet-portrait alone takes 11-17 s a
photo on CPU (3 photos: 10.8, 16.8, 12.9 s). The ~50 s above was contention (cutouts, candidates,
CLIP, a dev server, Chrome, ChatGPT sharing ~1 GB of free RAM). The lighter models
(`birefnet-general-lite`, `isnet-general-use`) could not be compared: their downloads from GitHub
timed out twice. So the model stays, and the fix is memory, not a faster model: one cutout process
plus one candidates process holds ~1 GB free; a second cutout process pushed free RAM to ~370 MB
(crash territory), so run one unless the other apps are closed. At ~15-20 s a cutout, 12,000 players
is ~60 hours of an idle machine; the top 2,000 by views (~81% of what players see) is ~10 hours.

### Kit card figure: decided (2026-10-29)

Jonno picked option C: one real cutout blacked out, the most typical of the 49 front-facing ones
(`scripts/photos/kit_figure.py`): Thiago Silva (cropped).jpg, Commons, credited on /credits
(`KIT_FIGURE_FILE`). It replaces the Lewandowski figure in `public/kit-figure.png`, on grey or on the
grade's material (light on sapphire and onyx), with the club crest top-right when the ground is live.

### Check tools (dev only, built 2026-10-29)

- `/photo-check`: the top 500 by views with the pipeline's cutout, on grey; click a card to mark it
  wrong (ink frame + the word WRONG). Marks save to `.scratch/photo-all/marks.json` (`wrong`).
  Players without a cutout yet are skipped until the pipeline reaches them; ones it gave up on are
  listed at the end as kit cards. Reload to see newly finished ones.
- A "Wrong photo" button on hover over any card that shows one of our cutouts, in `npm run dev` only
  (`FlagPhoto` in components/Sticker.tsx). Writes `flagged` in the same marks file.
- Next: for every id in `wrong`/`flagged`, cut three alternatives (`cutout.py --alts 3`, a way to
  redo a finished player is still to be written), a second page to pick one or the kit card, then
  `choices.json` for `publish.py`.

### Why Palmer, Trent and Lloris had no photo, and the fix (2026-10-29)

Jonno: "no way players like Palmer, Trent, Lloris don't have a picture". In the top 500, 45 of the 256
done had ended on the kit card. Causes, in order of weight: (1) the search read only files with the
surname in the file name from the player's own category and its year-named subcategories, so
Trent had 6 candidate files (now 37) and Lloris 14 (now 32); (2) "two people" rejected any photo with
a second face over half the main one's size (Lloris: 8 of 14); (3) in-era only: managers and old
legends have no photos from their playing years on Commons; (4) the crop floor of 2.3 face heights.
Changes: subcategories two levels down (up to 30; skips video, kit, cards, statues, fans...), no
surname needed in the file name (unnamed files score x0.85), the two-person gate only for a second
face over 0.85 of the main one's height (a neighbour over 0.5 scores x0.7; the cutout checks catch
leftovers), undated files allowed for anyone who played into the 2010s, the deep pass takes photos up
to 30 years after the career (CLIP rejects suits), and the crop floor is 2.0 face heights (the face
fills a bit more of the frame). The 55 players who had ended on the kit card were redone. On a test of
three: Trent 4 -> 11 usable photos, Lloris 1 -> 8; Palmer stays at 1 (11 of his 43 files have no
detectable face, 15 are two-shots, 8 are soft), cut at the new floor.

`redo_marked.py` queues the players Jonno marked wrong: his rejected photo is banned (`bad/<id>.json`)
and `cutout.py` cuts three alternatives for them (`marked.json`). The pick page for those is next.

Palmer's remaining problem was softness: most of his Commons photos have face sharpness 14-64 against
a gate of 80. The gate is now two: under 35 is mush and rejected, 35-80 is allowed but scored down by
(sharp / 80) squared, so a sharp photo always wins and a soft one still beats a kit card. (Rank test
against Jonno's round 1: 14/27 first, 22/27 top three, up from 13 and 21.) Palmer now has a cutout
from "COLE PALMER.jpg" (City era, soft, looking down): the best Commons has, and not a good photo.
`/photo-pick` is the page for the alternatives of the players marked wrong (`choices.json`).

### Starting and watching the jobs (2026-11-04)

The jobs died with the laptop's reboot on 2026-11-04 (nothing written since 2026-10-29 03:30), and a
status line saying "still running" had not been re-checked: always read `heartbeat.log` before saying so.

`scripts/photos/ops/` holds the three runners (copy them into `.scratch/photo-all/`): `watchdog.py`
starts `cand_drive.py` (candidates: the redo list, then everyone by views) and `drive.py 1` (one cutout
process), restarts either if it dies, and appends a line a minute to `.scratch/photo-all/heartbeat.log`
(counts, cutouts written in the last hour, top-500 progress, free RAM, which children are alive).
Launch it detached from the Claude app, as a child of WMI rather than of the session:

```
$d = "<repo>\.scratch\photo-all"
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "C:\Python314\python.exe -X utf8 `"$d\watchdog.py`""; CurrentDirectory = $d }
```

It survives the app closing; it does not survive a reboot (no scheduled task: that is a standing
change to the machine, ask first). After a reboot, validate the files (see the crash note above) and
launch it again. Do not start a second watchdog: check `heartbeat.log` is not already advancing.

## New rules (2026-11-05): only checked photos ship, as many pictures as possible

Jonno, after reviewing the top 500: "I'd rather we only use good photos in the game. Because having no
picture for someone decently well known looks bad." On the long tail: "I can scan through pretty quickly
with low effort, and I want there to be as many pictures as possible." His review: 64 of 419 top-500
cutouts wrong (15%) and 81 of the top 500 on the kit card, so 145 of the top 500 had no good photo
(Zidane, Garnacho, Hojlund, Owen, Foden, Arteta, Grealish, Drogba, Kvaratskhelia, Mahrez, Ian Wright,
Camavinga...). His choices:

1. **Only photos he has checked ship.** `/photo-check` now pages through every finished cutout, most
   viewed first, 100 at a time. Marks save as before; "Approve the rest" records every unmarked card
   of the batch in `approved.json` and loads the next batch. `publish.py` ships a cutout only if it is
   in `approved.json` (and not marked wrong) or he picked it on `/photo-pick` (`choices.json`); everyone
   else gets the kit card. The 366 top-500 cutouts he did not mark wrong were approved from his review.
2. **Ranking:** the normal automatic ranking for everyone, no strict bar: his check is the filter.
3. **Fill the gaps** (marked wrong, or on the kit card) three ways: (a) the next three best Commons
   photos, to pick from on `/photo-pick`; (b) Flickr Creative Commons photos through Openverse
   (licences that allow adaptation: BY, BY-SA, CC0, PDM; credited in `data/credits.json`); (c) managers
   as managers: for players now known as managers, photos from their managing years (tracksuit or
   suit) are allowed.

### Why the jobs seemed to stall (2026-11-04/05)

Not a slow search. The heartbeat has no lines from 21:10 to 10:13 and from 10:21 to 14:36, and Windows
logged "entering Modern Standby" at each of those times: the laptop was asleep and every process frozen.
The "2 players in 4 hours" was the first beat after a resume. At 14:38 a requested restart killed the
watchdog and the jobs. Fixes: the watchdog now asks Windows to stay awake (`SetThreadExecutionState`
ES_SYSTEM_REQUIRED; a closed lid still sleeps the laptop), kills and restarts a job that makes no
progress for 20 min (candidates) or 30 min (cutouts) while there is work for it, and logs players per
hour for both and `slept=Ns` when the clock jumped. It still dies at a reboot; see the task note below.

### Filling the gaps (2026-11-05)

- **(a) Alternatives from Commons:** `redo_marked.py` bans the photo he rejected and `cutout.py` cuts the
  next three that pass the checks (`/photo-pick`). 11 of the first 28 marked had none left to offer, which
  is what (b) and (c) are for.
- **(b) Openverse** (`from_openverse` in candidates.py): when Commons gives fewer than 3 usable candidates,
  query `api.openverse.org` for `"Full Name"`, licences BY, BY-SA, CC0, PDM, excluding Wikimedia (that is
  Commons again), photographs only, with his surname in the title or tags. Each hit is judged and ranked
  like a Commons photo and carries an `origin` (creator, licence, link) that `publish.py` writes into
  `portraits.json` and the credits page reads (no Commons lookup). The API takes 5-15 s a query and
  504s now and then (retried 3 times). **Yield is low for modern players:** sampled with the licence
  filter, Foden 3 results (a mural and two 1024 px photos with no usable face), Garnacho 0, Palmer 0,
  Camavinga 0, Hojlund 0; Owen 30. Flickr's Creative Commons matchday photos of the 2020s are mostly
  not licensed for reuse. It will help the 2000s and 2010s more than this season's squads.
- **(c) Managers as managers:** a player whose Wikidata occupation includes association football
  manager (Q628099) gets photos from his managing years (up to this year) in the candidate list, the
  CLIP check accepts a suit, jacket or tracksuit for him (a mural, wax figure, podium or sign still
  fail), and press conference, interview and ceremony in a file's description no longer reject it.
  Arne Slot went from 0 usable candidates to 10. Others it flags: anyone with that occupation, not
  only the famous managers, so an ex-player who coached for a season gets managing-era candidates too;
  the ranking's distance-from-prime term still prefers his playing years.
- `scripts/photos/ops/requeue_gaps.py` sends the players on the kit card, and marked ones with fewer than
  three alternatives, back through the candidate search with the current rules (184 on 2026-11-05).
  Run it after changing what `candidates.py` looks for; stop the watchdog first.

### Staying alive across a reboot

`scripts/photos/ops/install-task.ps1` registers one Task Scheduler task, "BallKnowledgePhotoPipeline",
that runs the watchdog at logon (`-Remove` deletes it). It is a standing change to the machine, so it
is installed only when Jonno says yes. The watchdog writes `watchdog.pid` and a second copy exits at once,
so the task firing while one is running does no harm.

**Installed 2026-11-05 on Jonno's yes:** Task Scheduler task "BallKnowledgePhotoPipeline" (state Ready, trigger
at logon, current user, hidden, no time limit). Tested by starting it by hand: it launched one watchdog and
its two jobs, and a second watchdog started afterwards exited at once (`watchdog.pid`). Remove it with
`powershell -ExecutionPolicy Bypass -File scripts\photos\ops\install-task.ps1 -Remove`. If the repo or worktree
moves, run the install script again from the new place (the task stores the absolute path). It needs the
runners copied into `.scratch/photo-all/` (they are, from `scripts/photos/ops/`).

### Upcoming games first (2026-11-13)

Jonno: no kit cards if at all possible; review the players in upcoming games first. `?focus=1` on
`/photo-check` and `/photo-pick` shows only the ids in `.scratch/photo-all/focus.json`, all on one page,
soonest first: every player in Spoofed's rounds, Steps' fixed players and the daily run's Line them up
fives from today to the end of each schedule (294 on 2026-11-13: 136 already approved or picked, 119
cutouts to check, 23 marked wrong, 16 with no usable photo). The list was written from the daily-run
branch's schedules. The watchdog's heartbeat stopped 2026-11-12 15:58 at 295 MB free: restart it before
asking it for more candidates.

## Automatic screen and tags (2026-11-13)

Jonno: no kit cards; every player in an upcoming game needs a good checked photo, and he does not want to check
thousands by eye. Two parts, both dev-only and both only *suggest*: only photos he checked ship.

### The screen (`scripts/photos/screen.py`)

Free and local (YuNet, SFace, CLIP ViT-B/32, numpy; no sklearn). Three stages, each resumable, all files in
`.scratch/photo-all/screen/`: `features` (measure every `out/<id>.0.webp`, `feat.json`, about 1 s a cutout),
`emb` (CLIP image embeddings, `emb.npz`), `fit` (fit on his decisions, print the held-out numbers, write
`screen.json`: `{cut, items: {id: {suspect, tags, why}}}`). Run `features`, `emb`, `fit` again after each
review batch; `fit` alone is seconds. Measures per cutout:

- **crop:** face box position and size in the frame (YuNet on the cutout), against the median of his approved
  cutouts; alpha on the top edge (head cut off) and low alpha on the bottom edge (floating).
- **cutout:** stray blobs, holes, half-transparent mass (ghosting), alpha beside the head (`checks.edge_mass`),
  a second face.
- **sharpness:** source face px and size, the candidate's own sharpness, pose (yaw, roll), and a blur score of the
  face in the cutout.
- **clothing:** CLIP zero-shot over four prompt groups (kit, training kit, smart or casual clothes, mural/statue/puppet),
  recomputed from the stored embeddings; and the embedding itself for the linear probe.
- **identity:** SFace similarity of the chosen photo's face to the player's other candidate photos (median, max, and how well
  those match each other). Low similarity to photos that match each other means "not him".
- **era:** photo year against the career span in `cand/<id>.json`.

A ridge logistic regression on the measures (and, when it scores better out of fold, a linear probe on the CLIP embedding)
is trained on his decisions: `approved.json` (fine) against `marks.json` wrong/flagged. A wrong card's cutout sits in
`rej/<id>.0.webp` once redone, which is the picture he judged. `suspect` is that model's score; the rule-based tags (below)
are suggested only on suspects, because on the rest the rules are wrong more often than right.

Tag rules have fixed thresholds in `DEFAULT_TH`: training (CLIP training prompts beat kit), notkit (smart/casual clothes),
lowq (source face under 80 px or a blurry face), crop (no face, second face, head cut off, floating, or the face far from where
his approved ones sit), unusable (mural, statue, sign, puppet), messy (blobs, holes, ghosting, mass beside the head), nothim
(low SFace match), old (photo years after the career ended). `better` is never suggested. Once he has confirmed enough tags
(12 of one tag), `fit` trains a per-tag probe on them and uses it in place of the rule when it holds up out of fold.

### The review page and the tags

`/photo-check` (and `?focus=1`, the players in upcoming games): suspects first, likely fine last. Hover a card for text
buttons over the lower half of the photo; click or press 1-9 to toggle (0 = fine, A = keep the suggestion); a card carries
several tags. 1 In training kit, 2 Not in kit, 3 Low quality, 4 Bad crop, 5 Unusable, 6 Must be a better option,
7 Not him, 8 Messy cutout, 9 Too old. **Soft** (starred) tags, training kit and better option, still ship; **every other tag
blocks**. The screen's guesses show dashed with a "?" until he acts on them and are never saved or shipped by themselves;
"Keep all N suggestions" confirms them in bulk, "Approve the other N" approves every card with no blocking tag (soft tags are
saved with it). No colour carries meaning: blocked cards have a heavy frame and the word BLOCKED, chosen tags are filled and ticked.

`marks.json` gains `tags: {id: [tag ids]}` (an empty list = looked, fine). `wrong` is kept in step (any blocking tag) so
`publish.py` and older code still work. Old marks have no tags; they stay wrong.

### Automatic fixes (on "Approve ... next batch", via `redo_marked.py`)

Blocked cards are queued once the batch is final (never at the click, so a mis-click can be undone):

- **Bad crop only:** the same photo is cut again and cropped three ways (looser, tighter, centred on the shoulders;
  `recrop.json`, `CROPS` in cutout.py); he picks one on `/photo-pick`.
- **Any other blocking tag** (low quality, not in kit, unusable, not him, messy, too old): the file is banned and the next
  three candidates that pass the checks are cut (the existing "marked" path).
- Soft tags: nothing happens; the photo ships. A search for a better option behind a soft tag is not built.

Nothing in either path approves anything: the new pictures sit on `/photo-pick` until he chooses, and `publish.py` still
ships only approved or picked cutouts.

### How well the screen agrees with him (measured 2026-11-13, `screen.py fit`)

His labels: 366 approved cutouts and 64 wrong ones (15% wrong), all from the top-500 review, so the famous, mostly decent
end of the pool; the long tail will have a higher wrong rate than this, and every number below is for his past marks only.
Every card is scored by a model that never saw it (5-fold, mean of four splits):

| model | AUC | flag top 10%: precision / recall | top 20% | top 30% |
|---|---|---|---|---|
| measures only | 0.85 | 0.53 / 0.36 | 0.47 / 0.62 | 0.38 / 0.77 |
| CLIP linear probe only | 0.86 | 0.60 / 0.41 | 0.47 / 0.62 | 0.39 / 0.78 |
| measures + probe (used) | 0.88 | 0.60 / 0.41 | 0.50 / 0.67 | 0.40 / 0.80 |

A random flag has precision 0.15. A plain 60/40 split (fit on 258, test on 172 with 25 wrong): AUC 0.86; flagging the top 20%
gives precision 0.50, recall 0.68. The suspect line on the page (`cut` in screen.json, 0.54) flags about 17% of his cards with
precision 0.52 and recall 0.59: **it misses about two in five of the cards he would mark, and half of what it flags he would
have kept.** Treat it as an ordering, not a verdict. The model choice was made on the same cards, so the best row is a
little optimistic. Across the 3,072 cutouts so far it marks 688 (22%) as suspects, 41 of the 275 screened players in the
upcoming-game list.

Tags: he marked "wrong", not why, so per-tag precision is "share of cards carrying the tag that he marked wrong" and recall
is only measurable on my own reading of his 64 wrong cards (`screen_reading.json`, from a contact sheet; not his tags).
The rules have fixed thresholds, scored on all 430:

| tag | fired | on his wrong | on approved | precision | recall on my reading |
|---|---|---|---|---|---|
| In training kit (soft) | 104 | 27/64 | 77/366 | 0.26 | 12/15 |
| Not in kit | 23 | 9/64 | 14/366 | 0.39 | 4/6 |
| Low quality | 40 | 13/64 | 27/366 | 0.33 | not read |
| Bad crop | 63 | 16/64 | 47/366 | 0.25 | not read |
| Unusable | 3 | 3/64 | 0/366 | 1.00 | 3/3 |
| Messy cutout | 26 | 7/64 | 19/366 | 0.27 | not read |
| Not him | 4 | 2/64 | 2/366 | 0.50 | not read |
| Too old | 6 | 3/64 | 3/366 | 0.50 | not read |
| Must be a better option | 0 | | | | never suggested |

Read plainly: Unusable (puppets, murals) and Not in kit are caught well, the training-kit rule finds most bibs but also
a lot of approved cards (soft tag, so harmless), and Bad crop, Low quality and Messy cutout are barely better than chance
(precision about twice the 15% base rate). Not him and Too old fire too rarely to judge. A tag is only suggested on a
suspect, and is only ever a dashed guess. The honest fix is his own tags: once 12 cards carry a tag, `fit` trains a probe for
that tag and prints its held-out AUC, so run `features`, `emb`, `fit` after each review batch.

Verified: the re-crop path ran end to end in the live pipeline on one real photo (Josip Šimunić, a test entry in `recrop.json`
on 2026-11-13): three different crops (looser, tighter, centred on the shoulders), all through the checks, `recrop.json`
emptied; the test outputs were deleted so the normal pass redoes him. The new `cutout.py` also ran the normal path
(several players, no errors). `redo_marked.py`'s routing was tested on a temp folder, `crop()` on a synthetic cutout, the
tag saves with the save call stubbed (his real marks were not touched), and `scripts/photos/test_screen.py` covers the
screen's pure parts. Not tried: his first real "Approve ... next batch" click with blocked cards (it starts `redo_marked.py`
in the background); the soft-tag "better option" search is not built.

## Gap batch and the sharpness floor (2026-11-17)

Jonno, after playing the daily run on 2026-11-16: too many well-known players show the kit card ("reads as
dev sloppiness"), and Figo's photo in Trace the link was too low quality and stood out. In the top 1,000 by
views, 545 had no published cutout: 363 had a cutout waiting for review, 118 were on the kit card, 66 were
marked wrong, 4 had not been searched.

### The sharpness floor

`checks.subject_sharpness`: Laplacian variance of the grey 440 px crop over the subject (alpha > 200, eroded
2 px so the matte's edge does not count). `checks.MIN_SUBJECT_SHARP = 55`, picked from the 480 published
cutouts: the five lowest are exactly the five he would call soft (Palmer 22, Figo 25, Park 28, Berbatov 39,
Guardiola 47: small old photos upscaled), then a gap to Sancho 60 (soft, acceptable); median 941. A sheet of
unreviewed cutouts at 40-55 was smeared; 55-70 was fine. On his labels: 6 of 84 wrong cards are under it
against 5 of 468 approved (those 5 being the ones above). 126 of 3,551 unreviewed cutouts (3.5%) fall under it.

It applies in two places:
- **Cut time** (`checks.crop_verdict`, so `cutout.py`): a crop under the floor is rejected and the next
  candidate tried, like any other failed check (`rejected`: "blurry (subject sharpness N)").
- **The screen** (`screen.py fit`): `screen.json` gains `blurry: {id: [k]}` for every `out/<id>.<k>.webp`
  under the floor (cached by file size in `screen/subj.json`). `/photo-check` treats a blurry first cutout as
  no photo (it counts in "kit"), `/photo-pick` leaves blurry alternatives out. So run `screen.py fit` after a
  batch of cutouts, or cutouts made by an older `cutout.py` can still show until it runs.

`test_screen.py` covers it: a detailed subject passes, the same subject shrunk to 60 px and blown back up fails,
a hard matte edge on a flat subject is not detail, and `blurry_cutouts` lists exactly the soft file.

### Wider search for the gaps (`candidates.py`)

- **Two people:** only a second face inside the square that `cutout.py` will crop (3.2 face heights wide, from
  0.55 above the face) counts, for the gate and for the neighbour penalty. A team-mate a few metres away in a
  match photo is cropped out anyway; this gate had taken 8 of Garnacho's 15 photos and 9 of Reijnders' 15.
- **Deep search when under three usable**, not only when none (Højlund's category holds 4 files; the Commons
  name search adds more), with room for 80 files on that pass.
- **Small faces in big photos:** a face under 50 px in the 900 px thumbnail is judged again in a 1280 or 1920 px
  thumbnail when the original is that wide. Commons now serves only standard thumbnail widths (1280 and 1920
  work, 1900 is a 400) and rate-limits originals (429), so the code asks only for those two. Garnacho: 1 usable
  photo to 3 (Copa América 2024 frames). A photo named after several players can now pass with the biggest face
  being someone else ("Lautaro, Di María y Garnacho"): Jonno's check and the screen's "not him" catch it.
- **No P373:** when Wikidata has no Commons category, the Commons sitelink (`Category:...`) is used. Antony had
  none ("Antony (footballer, born 2000)"): 0 usable photos to 5. Frimpong is the same case.
- The batch ran with `OV_ALWAYS=1`, so Openverse was asked for every gap player.

### The batch (`scripts/photos/ops/gap_batch.py`)

`python scripts/photos/ops/gap_batch.py <dir> [--n 150] [--repick Q1,Q2] [--dry]`, then
`candidates.py <dir> gaps-redo.json`, `cutout.py <dir> gaps-redo.json`, `gap_batch.py <dir> --finish`,
`screen.py <dir> fit`. It ranks every player with no published cutout (and not already approved or picked) by
views, a career that ended before 2015 counted at 40% unless he is a manager. Wikidata's manager occupation is
broad (Gascoigne, Bergkamp, Shearer have it), so in practice the order is close to plain views. The top N go in
`focus-gaps.json`, shown on their own at `/photo-check?focus=gaps` and `/photo-pick?focus=gaps` (any
`?focus=<name>` reads `focus-<name>.json`; `?focus=1` is still the upcoming-games list). Per player: a cutout
waiting for review stays unless it is blurry (then its file is banned and the next candidate cut); kit card,
never searched, or marked wrong with fewer than three sharp alternatives: searched again (old files go to `old/`).

**Re-picks** (`--repick`, players already published): the published file is banned, the player joins
`marked.json` for three new alternatives, and `--finish` puts the published cutout back as alternative 0 with
`current: true`. He stays in `approved.json`, so if Jonno picks nothing the photo on the site stays;
`/photo-pick` labels that card ON SITE NOW.

**The data folder.** The pipeline's data lives in the photo-pipeline worktree's `.scratch/photo-all` (and
`.scratch/models`). The review pages read `.scratch/photo-all` relative to the dev server, so another checkout
needs directory junctions to both (`New-Item -ItemType Junction -Path .scratch\photo-all -Target <that folder>`).

### Where the batch stands (2026-11-18)

- All 70 in `gaps-redo.json` were searched again (my run, 2026-11-17) and cut by the watchdog the logon task
  restarted after a reboot on 2026-11-18 (its own older `cutout.py`, so without the floor at cut time; the
  screen's floor hides the blurry ones). `gap_batch.py --finish` ran: the re-picks keep the photo on the site as
  alternative 0 (Guardiola 3 new, Palmer 2, Park 1, Berbatov 1, Figo none that passed).
- `screen.py fit` ran with the floor: 137 cutouts of 135 players are blurry and stay off the pages.
- **Ready for Jonno:** `/photo-check?focus=gaps` 75 cards; `/photo-pick?focus=gaps` 58 players (129 cards
  counting re-picks' current photos). 26 of the 155 are still on the kit card: Højlund, Maresca, Huijsen,
  Jobe Bellingham, Güler, Reijnders, Gascoigne, F. Inzaghi, Baldock, Kolo Muani, Camavinga, S. Giménez, Vinnie
  Jones, Guiu, McCoist, Brennan Johnson, Ethan Mbappé, Vlahović, Merson, Lineker, Khusanov, Ian Wright, Dorgu,
  Gittens, Davids, Palhinha. Most had usable candidates that the cutout checks threw out: someone or a limb
  beside the head (`edge_mass`: Maresca 5 of 7, Davids 3 of 4) or not in kit (Ian Wright, Lineker: pundit photos).
  The next fix for the first kind: keep only the matte's component that holds his face before the checks, so a
  team-mate's shoulder no longer fails the crop.
- Not run: `screen.py features` and `emb` for the new cutouts (about 500 MB free beside the watchdog's rembg; CLIP
  needs more). Unscreened cards sort with the suspects, so nothing is hidden; run both, then `fit`, on an idle machine.
- The watchdog runs the photo-pipeline worktree's scripts, which get the floor and the wider search only when that
  branch takes `main` (after this branch merges).
- The review cards no longer nest the dev "Wrong photo" button inside the card's own button (`StickerFace flag`),
  which threw a hydration error on both pages.
