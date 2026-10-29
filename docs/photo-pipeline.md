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
