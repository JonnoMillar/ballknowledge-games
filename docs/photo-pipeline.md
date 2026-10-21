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

Done means: the new ranking hits his pick at least ~22 of 27 on this file
(a test), a round 2 on fresh players confirms it, then the full run.
