# 🎓 Trick Academy (Phase 3)

A hub area where kids learn named math techniques ("moves") through a
7-stage journey per technique — **The Trick Academy Ascent** — instead of
answer-only drills. Techniques are *data-driven content*: adding one means
adding a definition + a problem generator, no new endpoints or UI code.

All techniques are original in-app content built on standard methods
(make-a-ten, ×11 digit-split, ×9 via ×10, number-bond division). No external
media, links, or embeds; no new chat surfaces (COPPA posture unchanged).

## The Ascent — 7 stages

| # | Stage | What happens | Gate |
|---|-------|--------------|------|
| 1 | **The Dare** | A cold-open problem ("Bet you can't solve 43 × 11 in 5 seconds") the kid attempts with *no teaching*, plus a **prediction commit**: they lock in one of 3 predictions before anything is revealed. Recorded server-side (`trick_dares`) — it opens the evidence arc. | Attempt + prediction recorded |
| 2 | **The Reveal** | One slow, whole performance of the trick; steps are *named* but not explained. Ends with a fully-scaffolded **mimic rep** the kid performs step-by-step with all hints on. | Mimic rep with **all** steps correct |
| 3 | **The Why Lab** | The place-value "why" as a manipulable visual model (frontend explorers recompute live as the kid changes numbers), then a **probe**: the kid answers a "what happens if…?" question by *producing a model state* (numbers the server verifies against the technique's rule). Wrong state → hint, no advance. | Server-verified probe state |
| 4 | **Side-by-Side** | Alternating do-along reps (the guide works an example, then the kid does one with scaffolding: full hints → steps only) and solo reps (answer only). A failed solo rep routes back to a guide rep. | **3 consecutive solo reps** correct |
| 5 | **The Remix** | Unseen variants: story "skins", the technique's harder generator range (mastery variants), and **one interleaved problem from a previously mastered technique**. | ≥ 80% (existing `pass_threshold`) |
| 6 | **The Boss Gate** | Timed set vs. Bram the Trickster, target technique only, graded server-side with elapsed time measured from the server-held start timestamp (+5 s grace). Passing awards XP/coins + the technique badge (once only) and schedules the Encores. | ≥ 80% inside the time limit |
| 7 | **Encore & Exhibit** | (a) **Teach-back**: the kid teaches the trick via step-ordering + picking the correct "why" explanation (kid-safe inputs only). (b) **Encore** re-tests at **+1/+3/+7 days** after mastery (3 problems, ≥2 = retained); a missed +3-day Encore quietly flags the technique `struggling` for parents — never a kid-facing fail state. (c) The **parent evidence pack** shows the whole arc: Dare → Boss best → teach-back → Encore retention. | — |

Failing the Boss Gate routes back to **the Remix** with an iteration line
("Bosses aren't beaten first try — they're beaten *eventually*"), never to
the start.

## Launch set (unlock in order)

| Order | Technique | Move | Badge |
|-------|-----------|------|-------|
| 1 | `make_a_ten` | Split the second number to complete a ten (11–12 band: next ten) | 🔟 Make-a-Ten Master (50 XP / 25 coins) |
| 2 | `times_11_basic` | Digit-split, digit sum ≤ 9 (band caps 7 / 9 / 9) | ✨ Times-11 Splitter (60 XP / 30 coins) |
| 3 | `times_11_carry` | Digit-split with carries + place-value why (11–12 mastery: 3-digit ×11) | 🚀 Times-11 Carry-On Captain (80 XP / 40 coins) |
| 4 | `times_9` | "Start with 10": 10 groups minus one group (11–12: two-digit n) | 🛗 Times-9 Elevator Operator (60 XP / 30 coins) |
| 5 | `bond_division` | Split the dividend into two friendly parts, divide, add (choice step picks the friendly split) | 🍌 Bond-Split Divider (80 XP / 40 coins) |

Difficulty scales by the existing age bands (`7-8` / `9-10` / `11-12`):
operand ranges, digit-sum caps, boss set size/time (6×20 s / 6×15 s / 8×12 s).

## Architecture

**Backend** (FastAPI, server-validated like the Math Challenge):

- `app/utils/trick_challenge.py` — the engine + content. `TECHNIQUES` holds
  each technique's copy (dare line, reveal performance, why text + probe,
  skins, teach-back steps/choices, badge, rewards); `GENERATORS` maps a
  technique id to a pure function `(band, rng, mastery=False) -> problem`.
  A problem is `{prompt, operation, answer, operands, steps, visual}` where
  steps are `{key, label, kind: value|choice, expected, hint?, options?}` —
  `expected` never leaves the server (`public_problem` strips it).
- `app/routers/trick_academy.py` — prefix `/api/trick-academy`. Session
  state machine in `trick_sessions`; collections: `trick_sessions`,
  `trick_mastery`, `trick_attempts`, `trick_dares`, `trick_teachbacks`,
  `trick_encores` (registered in `app/database.py`).
- `app/utils/rewards.py::award_standalone_rewards` — quest-free payout with
  the technique's own badge name; mastery pays exactly once.
- Parent evidence: `GET /api/challenges/child/{id}/evidence` now returns
  `{quests: [...], techniques: [...]}` (was a bare list; the frontend was
  updated in the same change). `GET /api/trick-academy/child/{id}/evidence`
  returns the technique arcs alone.

**Frontend** (React + TS):

- `src/components/trick/` — `TrickAcademy` (trail, due-Encore banner,
  teach-back entry), `TrickSession` (stages 1–6 state machine),
  `TeachBack` (stage 7a), `TrickVisual` (static visual renderers +
  interactive Why Lab explorers for `make_ten` / `digit_split` /
  `ten_groups` / `bond_split`).
- Entry points: a gold **Trick Academy portal** in the 3D hub
  (`worldKey: 'trick_academy'`, intercepted by `GamePage` before the quest
  lookup) and a 🎓 button on the game page. `GamePage` gains an `ACADEMY`
  state; leaving reloads profile/quests because Boss rewards change totals.
- `ParentDashboard` gains a "🎓 Trick Academy — Technique Mastery" card
  rendering the arc chips (Dare, teach-back, +1/+3/+7 Encore status).

## API summary

```
GET  /api/trick-academy/techniques?child_id=
POST /api/trick-academy/sessions                      -> Dare payload (201)
POST /api/trick-academy/sessions/{id}/dare             -> Reveal content
POST /api/trick-academy/sessions/{id}/reveal/mimic     -> scaffolded problem
POST /api/trick-academy/sessions/{id}/reveal/mimic/submit
GET  /api/trick-academy/sessions/{id}/why
POST /api/trick-academy/sessions/{id}/why/submit       -> probe check
POST /api/trick-academy/sessions/{id}/side-by-side/next
POST /api/trick-academy/sessions/{id}/side-by-side/submit
POST /api/trick-academy/sessions/{id}/remix/start | /submit
POST /api/trick-academy/sessions/{id}/boss/start  | /submit
GET  /api/trick-academy/child/{id}/teach-back/{technique_id}
POST /api/trick-academy/teach-back/submit
GET  /api/trick-academy/child/{id}/encores
POST /api/trick-academy/encores/{id}/start | /submit
GET  /api/trick-academy/child/{id}/evidence
```

Every endpoint verifies the caller owns the child (same `_verify_child_access`
pattern as challenges). Problems are generated and graded server-side; the
client only ever receives prompts, labels, hints and choice options.

## Adding a technique

1. Add a definition to `TECHNIQUES` in `app/utils/trick_challenge.py`
   (copy, reveal example, why + probe, 2 skins, teach-back, badge, rewards)
   and a probe check to `PROBE_CHECKS`.
2. Add a generator to `GENERATORS` returning the standard problem shape
   (reuse a visual type or add a renderer + explorer in `TrickVisual.tsx`).
3. Set `order` — unlocking is sequential by mastery of the previous order.
4. Add generator invariant checks to `backend/tests/test_trick_academy.py`.

## Tests

```
PYTHONPATH=backend python backend/tests/test_trick_academy.py
```

83 stubbed checks (in-memory collections, no live Mongo): generator
invariants (300 problems × 3 bands × 5 techniques), probes, grading, the
full Ascent walk-through, reward-once semantics, Encore scheduling/flags,
teach-back, evidence shapes, boss-fail routing, Remix interleaving, and
cross-parent 403s. Frontend: `npm run build` (tsc + vite) must pass.
