# Hub brief

For Jonno and Claude: the page every hub concept is judged against, and the
source for generation prompts. Not a client document. Written 2026-11-13,
before a second, wider round of scout's-office concepts. The scout's office
in `lobby.html` is the first concept, not the decision.

## What the hub is for

1. **Bring players back daily.** Today's assignment (the daily run: six short
   tasks, one report) is the hero; everything else is quieter.
2. **Pick a game** in one tap, knowing what each one is from its label.
3. **Show progress at a glance:** done today, streak, collection.
4. **Be a place.** A world with its own identity (the way Krillion has its
   ocean), so the site stops looking like "the first thing Claude made".

**Success:** a mate opens it on their phone and plays today's run within 10
seconds without asking anything; they come back tomorrow; nobody says "that's
AI" or "that doesn't make sense".

## Who visits

Football fans aged 16 to 26, mostly on phones, often from a link in a group
chat.

| Visitor | Wants | So the hub must |
|---|---|---|
| Slop-hater | Nothing that looks generated: waxy sheen, mangled hands, fake text or crests | Use real photos and badges; no generated faces or type. A stylised look hides AI tells better than fake-real. |
| Easily overwhelmed | One obvious thing to do | Make today's run the clear hero; everything else secondary, never a wall of equal objects. |
| Commuter | Play in 30 seconds, one thumb, bad signal | Load light on a phone; no slow zooms; thumb-reach targets. |
| Streak keeper | Progress at a glance | Show a done state on each object (stamped, ticked) and the streak. |
| Ball-knowledge flexer | Authentic football detail, results to brag about | Get kits, boards and pennants right; sharing is easy. |
| Creative explorer | A world to poke at | Add a delight layer: easter eggs, small wins (spotting a badge), changes with the season or fixtures. |
| Group-chat arrival | Came from a shared link, wants to play now | Not gate anything: a link goes straight into its game. |
| Lighter fan | Not feeling stupid | Plain labels saying what each game is. |
| Colourblind or low vision (Jonno is red-green colourblind) | Readable everything | Never meaning by hue alone; strong contrast; real type. |

**The tension:** the explorer wants a rich world; the overwhelmed visitor,
the commuter and the slop-hater want calm, fast and real. Answer it in two
layers: a calm, fast front (today's run, the games, progress) that works on
its own, and the world as backdrop and delight around it.

## Phone first

Most players are on phones, so every concept shows its **phone frame next to
its desktop frame** from the first image; no "phone layout later". Three
patterns to try across the concepts:

1. **Crop of the scene:** the board as a vertical strip that scrolls.
2. **A different shot:** a close-up of one surface (a desk, a clipboard, a
   notebook) with the run big and the games in a drawer or a list.
3. **Desktop gets the room, phone gets a simple list made of the room's
   materials** (paper, tape, cork), with the world as a header.

## Constraints already decided

- Cheerful, daylight, rich contrast, no colour wash; Golden cool light.
- Every object belongs in the world and has a job; nothing drawn in code.
- Labels, title and chrome are real type; red only on the one action and the
  suggested game.
- Real club badges and flags only (ClubBadge, `public/flags`).
- Click into a game never blinks: the object grows into its game.
- Higgsfield: one variant by default, concept approved before generating.

## How a concept is judged

Score each against the visitors above, then a 5-second test on 5 mates: "what
is this?", "where would you tap to play today's?", "would you come back?".
Shortlist 2 or 3, then layout in grey boxes (phone and desktop), then one
item finished end to end in the real app, measured for load weight on a
phone.

## Round 2: six concepts for approval

Each is one desktop frame plus one phone frame, at low quality (0.25 credits
an image): **12 images, about 3 credits.** Nothing is generated until Jonno
approves the list. The current lobby stays as the control.

| # | Concept | Desktop frame | Phone frame | Who it should win |
|---|---|---|---|---|
| 0 | **Scout's office (control)** | Today's `lobby.html` | Not made yet: one phone crop for comparison | — |
| 1 | **Sunday-league portakabin** | Corrugated walls, kettle, muddy boots, whiteboard of fixtures, the run as the team sheet pinned on top | Close-up of the whiteboard: the run big, games as magnets below | Flexer, lighter fan: warm, real, unpretentious |
| 2 | **Academy analyst's office** | Clean glass office over a training pitch, tablet and printouts on the desk, calm and bright | The tablet on the desk is the screen: a simple list | Overwhelmed, commuter: calm, little clutter |
| 3 | **A fan's bedroom wall** | Above a desk: posters, scarves, a corkboard of tickets and stickers, a controller on the desk | The corkboard close-up, scrolling | Audience match (16 to 26), explorer |
| 4 | **Scout's car on a matchday** | Dashboard view, notebook on the passenger seat, floodlights through the windscreen | The notebook pages: one game a page, the run on the first | Explorer, streak keeper (notebook ticks) |
| 5 | **Dressing room** | Kit pegs with shirts, the team sheet on the door, tactics board | The team sheet on a clipboard: the run first, games as the line-up | Flexer, lighter fan: instantly football |
| 6 | **Stylised scout's office** | Concept 0 in the grain-illustration style (photo reference + style prompt, as the Olise test) | Same phone crop as 0 | Slop-hater: tests whether stylised beats fake-real |

Open for Jonno: approve, cut or swap concepts before anything is generated.
