"""Trick Academy technique engine (Phase 3 — "The Trick Academy Ascent").

Pure functions + content data, no database or framework dependencies.

Techniques are DATA (TECHNIQUES below): each definition carries its copy,
worked example, why-lab probe, remix skins and teach-back content, plus the
name of its problem generator. Adding a technique = adding a definition and
a generator function; the 7-stage flow (routers/trick_academy.py) is generic
and never changes per technique:

  1. The Dare        — cold attempt + a locked-in prediction commit
  2. The Reveal      — one slow, whole performance (steps named, no why yet),
                       then the kid mimics it once with full scaffolding
  3. The Why Lab     — a manipulable visual model + a "what happens if...?"
                       probe the kid answers by producing a model state
  4. Side-by-Side    — alternating do-along reps with fading hints;
                       gate = 3 consecutive unaided (solo) correct reps
  5. The Remix       — unseen variants, bigger numbers, word-problem skins,
                       one mastered technique interleaved; gate = >= 80%
  6. The Boss Gate   — timed set, target technique only; failing routes
                       back to the Remix (iteration, not failure)
  7. Encore & Exhibit— teach-back (step ordering + explanation choice) and
                       spaced Encore re-tests at +1 / +3 / +7 days

Problems carry scaffolded steps for the do-along stages. Expected step
values live only on the server; step labels may contain {tokens} that the
client fills from the child's OWN earlier answers (or from the split the
child chose), so a label never leaks a value the child has not produced.
"""
import random
from typing import Callable, Dict, List, Optional

# --------------------------------------------------------------------------
# Shared stage configuration
# --------------------------------------------------------------------------

AGE_BANDS = ["7-8", "9-10", "11-12"]

# Boss Gate set size / time budget per age band.
BOSS_CONFIG = {
    "7-8": {"count": 6, "seconds_per_problem": 20},
    "9-10": {"count": 6, "seconds_per_problem": 15},
    "11-12": {"count": 8, "seconds_per_problem": 12},
}
BOSS_TIME_GRACE_SECONDS = 5

REMIX_COUNT = 6
ENCORE_COUNT = 3
ENCORE_OFFSETS_DAYS = [1, 3, 7]
SOLO_STREAK_TO_PASS = 3

# The Dare's prediction commit — a tap-to-commit bet, not a quiz.
PREDICTION_OPTIONS = [
    "I'll learn this move in one visit! 💪",
    "It looks tricky… but I'll try! 🤔",
    "No way that's possible! 😲",
]

BOSS_NAME = "Bram the Trickster"
BOSS_TAUNTS = [
    "Ha! Nobody learns my tricks that fast!",
    "You'll never keep up with me!",
    "That move? IMPOSSIBLE to learn in one visit!",
]
BOSS_ITERATION_LINE = (
    "Bram is still standing — but every Trickster fears a rematch. "
    "Remix your skills and come back stronger!"
)


# --------------------------------------------------------------------------
# Problem generators. Each returns:
#   {prompt, operation, answer, operands, steps, visual}
# steps: [{key, label, kind: "value"|"choice", expected, hint?, options?}]
# choice options: [{label, parts}] with `expected` = index of the right one.
# --------------------------------------------------------------------------

def _step(key, label, expected, hint=None, kind="value", options=None):
    step = {"key": key, "label": label, "kind": kind, "expected": expected}
    if hint:
        step["hint"] = hint
    if options is not None:
        step["options"] = options
    return step


def gen_make_a_ten(band: str, rng: random.Random, mastery: bool = False) -> dict:
    if band == "11-12":
        # Make the NEXT ten: 28 + 7 -> 28 needs 2 to reach 30, then + 5.
        tens = rng.randint(1, 5)
        d = rng.randint(6, 9)
        a = tens * 10 + d
        need = 10 - d
        rest = rng.randint(2, 8) if mastery else rng.randint(1, 6)
    else:
        a = rng.randint(6, 9)
        need = 10 - a
        max_rest = 5 if band == "7-8" else 7
        rest = rng.randint(2 if mastery else 1, max_rest)
    b = need + rest
    ten_value = a + need
    total = a + b
    steps = [
        _step("need", f"How many more does {a} need to reach {ten_value}?", need,
              hint=f"Count up from {a} to {ten_value} on your fingers."),
        _step("split", f"Split {b}: it gives {{need}} to make the ten. What's left over?", rest,
              hint=f"{b} is made of {{need}} and one more part."),
        _step("answer", f"Now it's easy: {ten_value} + {{split}} = ?  So {a} + {b} = ?", total),
    ]
    return {
        "prompt": f"{a} + {b} = ?",
        "operation": "addition",
        "answer": total,
        "operands": {"a": a, "b": b},
        "steps": steps,
        "visual": {"type": "make_ten", "a": a, "b": b, "need": need,
                   "rest": rest, "ten_value": ten_value, "total": total},
    }


def _times_11_operands(band: str, rng: random.Random, carry: bool):
    if carry:
        max_sum = {"7-8": 13, "9-10": 16, "11-12": 18}[band]
        while True:
            f = rng.randint(2, 9)
            l = rng.randint(2, 9)
            if 10 <= f + l <= max_sum:
                return f, l
    else:
        max_sum = {"7-8": 7, "9-10": 9, "11-12": 9}[band]
        while True:
            f = rng.randint(1, 9)
            l = rng.randint(1, 8)
            if f + l <= max_sum:
                return f, l


def gen_times_11_basic(band: str, rng: random.Random, mastery: bool = False) -> dict:
    f, l = _times_11_operands(band, rng, carry=False)
    n = f * 10 + l
    mid = f + l
    steps = [
        _step("first", "The answer has 3 digits. What's the FIRST digit?", f,
              hint=f"Look at the first digit of {n} — it stays in front."),
        _step("middle", f"Add the two digits of {n}: {f} + {l} = ?", mid,
              hint="Just add the digits together — that's the middle."),
        _step("answer", f"Build it: first {{first}}, middle {{middle}}, last {l}.  {n} × 11 = ?", n * 11),
    ]
    return {
        "prompt": f"{n} × 11 = ?",
        "operation": "multiplication",
        "answer": n * 11,
        "operands": {"n": n},
        "steps": steps,
        "visual": {"type": "digit_split", "n": n, "first": f, "middle": mid,
                   "last": l, "carry": 0},
    }


def gen_times_11_carry(band: str, rng: random.Random, mastery: bool = False) -> dict:
    # Remix/Boss at the top band escalates to 3-digit numbers (answer-only
    # use — the adjacent-pair version of the same move).
    if mastery and band == "11-12" and rng.random() < 0.4:
        while True:
            h = rng.randint(1, 9)
            t = rng.randint(0, 9)
            u = rng.randint(1, 9)
            if t + u >= 10 or h + t >= 10:
                break
        n = h * 100 + t * 10 + u
        return {
            "prompt": f"{n} × 11 = ?",
            "operation": "multiplication",
            "answer": n * 11,
            "operands": {"n": n},
            "steps": [],
            "visual": None,
        }
    f, l = _times_11_operands(band, rng, carry=True)
    n = f * 10 + l
    s = f + l
    steps = [
        _step("digit_sum", f"Add the two digits of {n}: {f} + {l} = ?", s,
              hint="Add them like always — watch what happens this time!"),
        _step("first", "The sum has TWO digits, so 1 carries to the front. "
                       f"First digit = {f} + 1 = ?", f + 1,
              hint=f"Give the carried 1 to the {f}."),
        _step("middle", "The middle digit is the ONES digit of {digit_sum}. What is it?", s % 10,
              hint="{digit_sum} ends in which digit?"),
        _step("answer", f"Build it with the carried 1: {n} × 11 = ?", n * 11),
    ]
    return {
        "prompt": f"{n} × 11 = ?",
        "operation": "multiplication",
        "answer": n * 11,
        "operands": {"n": n},
        "steps": steps,
        "visual": {"type": "digit_split", "n": n, "first": f + 1, "middle": s % 10,
                   "last": l, "carry": 1, "raw_sum": s},
    }


def gen_times_9(band: str, rng: random.Random, mastery: bool = False) -> dict:
    if band == "7-8":
        n = rng.randint(3, 6)
    elif band == "9-10":
        n = rng.randint(4, 9)
    else:
        n = rng.randint(12, 29) if mastery else rng.randint(11, 19)
        if n % 10 == 0:
            n += 3
    steps = [
        _step("ten", f"Start with 10 groups: 10 × {n} = ?", 10 * n,
              hint="Times 10 is easy — just add a zero."),
        _step("answer", f"9 is ONE group less than 10, so take away one group of {n}: "
                        f"{{ten}} − {n} = ?  So 9 × {n} = ?", 9 * n),
    ]
    return {
        "prompt": f"9 × {n} = ?",
        "operation": "multiplication",
        "answer": 9 * n,
        "operands": {"n": n},
        "steps": steps,
        "visual": {"type": "ten_groups", "n": n, "ten_product": 10 * n, "answer": 9 * n},
    }


def gen_bond_division(band: str, rng: random.Random, mastery: bool = False) -> dict:
    if band == "7-8":
        d = rng.choice([2, 3, 5])
        q1 = 10
        q2 = rng.randint(2, 9)
    elif band == "9-10":
        d = rng.choice([4, 6, 7, 8])
        q1 = rng.choice([10, 20])
        q2 = rng.randint(2, 9)
    else:
        d = rng.choice([12, 13, 14, 15, 16])
        q1 = rng.choice([10, 20])
        q2 = rng.randint(2, 9)
    p1, p2 = d * q1, d * q2
    total_d = p1 + p2

    # Decoys: splits of the same dividend where at least one part does NOT
    # divide evenly — the "unfriendly" splits the move teaches kids to avoid.
    candidates = [
        ((total_d // 10) * 10, total_d % 10),
        (p1 + 1, p2 - 1),
        (p1 - 1, p2 + 1),
        (total_d // 2, total_d - total_d // 2),
        (p1 + d, p2 - d) if p2 - d > 0 else (p1 - d, p2 + d),
    ]
    decoys = []
    for c1, c2 in candidates:
        if c1 <= 0 or c2 <= 0 or (c1, c2) == (p1, p2):
            continue
        if c1 % d == 0 and c2 % d == 0:
            continue  # actually friendly — not a decoy
        if (c1, c2) not in decoys:
            decoys.append((c1, c2))
        if len(decoys) == 2:
            break
    options = [{"label": f"{p1} + {p2}", "parts": [p1, p2]}] + [
        {"label": f"{c1} + {c2}", "parts": [c1, c2]} for c1, c2 in decoys
    ]
    rng.shuffle(options)
    correct_index = next(i for i, o in enumerate(options) if o["parts"] == [p1, p2])

    steps = [
        _step("split", f"Which split of {total_d} makes two FRIENDLY parts for ÷ {d}?",
              correct_index, kind="choice", options=options,
              hint="Friendly parts are multiples of the divisor — they divide with nothing left over."),
        _step("q1", "{part1} ÷ " + f"{d} = ?", q1),
        _step("q2", "{part2} ÷ " + f"{d} = ?", q2),
        _step("answer", f"Add the part-answers together: {total_d} ÷ {d} = ?", q1 + q2),
    ]
    return {
        "prompt": f"{total_d} ÷ {d} = ?",
        "operation": "division",
        "answer": q1 + q2,
        "operands": {"D": total_d, "d": d},
        "steps": steps,
        "visual": {"type": "bond_split", "dividend": total_d, "divisor": d,
                   "parts": [p1, p2], "quotients": [q1, q2], "answer": q1 + q2},
    }


GENERATORS: Dict[str, Callable[..., dict]] = {
    "make_a_ten": gen_make_a_ten,
    "times_11_basic": gen_times_11_basic,
    "times_11_carry": gen_times_11_carry,
    "times_9": gen_times_9,
    "bond_division": gen_bond_division,
}


def generate_problem(technique_id: str, band: str, rng: Optional[random.Random] = None,
                     mastery: bool = False) -> dict:
    rng = rng or random.Random()
    band = band if band in AGE_BANDS else "7-8"
    return GENERATORS[technique_id](band, rng, mastery=mastery)


# --------------------------------------------------------------------------
# Grading helpers
# --------------------------------------------------------------------------

def grade_steps(problem: dict, step_answers: List[int]) -> List[dict]:
    """Grade scaffolded step answers against the server-held problem."""
    results = []
    for i, step in enumerate(problem.get("steps", [])):
        given = step_answers[i] if i < len(step_answers) else None
        results.append({
            "key": step["key"],
            "correct": given == step["expected"],
            "expected": step["expected"],
        })
    return results


def steps_final_correct(problem: dict, step_answers: List[int]) -> bool:
    """The final answer of a scaffolded problem is its last step."""
    steps = problem.get("steps", [])
    if not steps:
        return False
    last = len(steps) - 1
    given = step_answers[last] if last < len(step_answers) else None
    return given == steps[last]["expected"]


def all_steps_correct(problem: dict, step_answers: List[int]) -> bool:
    results = grade_steps(problem, step_answers)
    return bool(results) and all(r["correct"] for r in results)


# --------------------------------------------------------------------------
# Why Lab probes — the kid answers by PRODUCING a model state (numbers the
# server can verify against the technique's rule), not by picking text.
# `given` values are fixed per technique so probes are stable and checkable.
# --------------------------------------------------------------------------

def _probe_make_a_ten(values: List[int]) -> bool:
    if len(values) != 2:
        return False
    a, b = values
    return 6 <= a <= 9 and a + b == 10


def _probe_times_11_basic(values: List[int]) -> bool:
    if len(values) != 2:
        return False
    n, product = values
    if not (10 <= n <= 99) or product != 11 * n:
        return False
    return (n // 10) + (n % 10) >= 10


def _probe_times_11_carry(values: List[int]) -> bool:
    # Given n = 53 in the payload: kid enters 10×53 and the full 11×53.
    if len(values) != 2:
        return False
    ten_part, total = values
    return ten_part == 530 and total == 583


def _probe_times_9(values: List[int]) -> bool:
    # Given n = 46: does "start with 10" still work on a big number?
    if len(values) != 2:
        return False
    ten_part, total = values
    return ten_part == 460 and total == 414


def _probe_bond_division(values: List[int]) -> bool:
    # Given 96 ÷ 8: kid builds their OWN friendly split + the answer.
    if len(values) != 3:
        return False
    p1, p2, answer = values
    return (
        p1 > 0 and p2 > 0
        and p1 + p2 == 96
        and p1 % 8 == 0 and p2 % 8 == 0
        and answer == 12
    )


PROBE_CHECKS: Dict[str, Callable[[List[int]], bool]] = {
    "make_a_ten": _probe_make_a_ten,
    "times_11_basic": _probe_times_11_basic,
    "times_11_carry": _probe_times_11_carry,
    "times_9": _probe_times_9,
    "bond_division": _probe_bond_division,
}


def check_probe(technique_id: str, values: List[int]) -> bool:
    check = PROBE_CHECKS.get(technique_id)
    return bool(check and check(values))


# --------------------------------------------------------------------------
# Technique definitions (content). All copy is original KidQuest content.
# --------------------------------------------------------------------------

TECHNIQUES: List[dict] = [
    {
        "id": "make_a_ten",
        "order": 1,
        "name": "Make-a-Ten",
        "icon": "🔟",
        "tagline": "Snap two numbers together to make a friendly ten — then the rest is easy.",
        "dare_line": "Bram added {prompt} in one second flat. One second! Think YOU could do that?",
        "xp_reward": 50,
        "coin_reward": 25,
        "badge": {"id": "badge_make_a_ten", "name": "Make-a-Ten Master", "icon": "🔟"},
        "reveal_example": {
            "prompt": "8 + 6 = ?",
            "answer": 14,
            "performance": [
                {"name": "Spot the gap", "text": "8 is sitting at 8. It needs 2 more to become a perfect 10."},
                {"name": "Split the 6", "text": "The 6 splits into 2 and 4. The 2 runs over to the 8…"},
                {"name": "Make the ten", "text": "8 + 2 = 10! Now the problem is just 10 + 4."},
                {"name": "Glide home", "text": "10 + 4 = 14. Done — no counting on fingers!"},
            ],
            "visual": {"type": "make_ten", "a": 8, "b": 6, "need": 2, "rest": 4,
                       "ten_value": 10, "total": 14},
        },
        "why": {
            "text": "Tens are the friendliest numbers in math — adding to a ten needs "
                    "no counting at all. So smart adders MOVE part of one number to "
                    "complete the ten first, then glide through what's left.",
            "probe": {
                "instruction": "What happens if the second number is EXACTLY the missing piece? "
                               "Pick a number from 6 to 9, then enter the partner that makes "
                               "exactly 10 — no leftovers!",
                "given": {},
                "input_labels": ["First number (6–9)", "Its partner"],
                "wrong_hint": "The two numbers must land on exactly 10, and the first one lives between 6 and 9.",
            },
        },
        "skins": [
            "Maya found {a} shells on the beach, then found {b} more. How many shells does she have now?",
            "There are {a} parrots in one tree and {b} parrots in another. How many parrots in all?",
        ],
        "teach_back": {
            "steps": [
                {"id": "gap", "label": "Spot how many the first number needs to make a ten"},
                {"id": "split", "label": "Split the second number into that piece and the leftover"},
                {"id": "ten", "label": "Make the ten"},
                {"id": "glide", "label": "Add the leftover to the ten"},
            ],
            "why_choices": [
                "Because tens are easy to add — finishing the ten first means no counting",
                "Because bigger numbers are always added first",
                "Because 10 is a magic number that changes the other number",
            ],
            "why_correct": 0,
        },
    },
    {
        "id": "times_11_basic",
        "order": 2,
        "name": "Times-11 Split",
        "icon": "✨",
        "tagline": "Split the digits, drop their sum in the middle — that's the whole trick.",
        "dare_line": "Bram just answered {prompt} before you could blink. There's a MOVE behind it. Want it?",
        "xp_reward": 60,
        "coin_reward": 30,
        "badge": {"id": "badge_times_11_basic", "name": "Times-11 Splitter", "icon": "✨"},
        "reveal_example": {
            "prompt": "43 × 11 = ?",
            "answer": 473,
            "performance": [
                {"name": "Split", "text": "Pull the digits of 43 apart: 4 … 3. Leave a gap in the middle."},
                {"name": "Add", "text": "Add the digits: 4 + 3 = 7."},
                {"name": "Drop it in", "text": "Drop the 7 into the gap: 4 – 7 – 3."},
                {"name": "Read it", "text": "473! That's 43 × 11, done in your head."},
            ],
            "visual": {"type": "digit_split", "n": 43, "first": 4, "middle": 7,
                       "last": 3, "carry": 0},
        },
        "why": {
            "text": "11 is really 10 + 1. Multiplying by 11 means every digit gets counted "
                    "twice — once shifted a place left (×10) and once in its own place (×1). "
                    "Where the two copies overlap, the digits add — that's the sum you see "
                    "sitting in the middle.",
            "probe": {
                "instruction": "What happens if the two digits add up to 10 or MORE? Use the "
                               "explorer to find a two-digit number whose digits sum to 10+, "
                               "then enter the number and its × 11 answer. Watch the middle!",
                "given": {},
                "input_labels": ["A two-digit number (digits sum to 10+)", "Its × 11 answer"],
                "wrong_hint": "Check two things: the digits of your number must add to 10 or more, and the answer must be exactly 11 × your number.",
            },
        },
        "skins": [
            "11 monkeys each carry {n} bananas. How many bananas in all?",
            "Each of the 11 tour boats holds {n} kids. How many kids can ride in total?",
        ],
        "teach_back": {
            "steps": [
                {"id": "split", "label": "Split the two digits apart with a gap in the middle"},
                {"id": "add", "label": "Add the two digits together"},
                {"id": "drop", "label": "Drop the sum into the gap"},
                {"id": "read", "label": "Read the three digits as the answer"},
            ],
            "why_choices": [
                "Because 11 = 10 + 1, each digit gets counted in two places and the overlaps add up",
                "Because 11 is a lucky number",
                "Because the answer always has the same first and last digits",
            ],
            "why_correct": 0,
        },
    },
    {
        "id": "times_11_carry",
        "order": 3,
        "name": "Times-11 Carry-On",
        "icon": "🚀",
        "tagline": "When the middle sum spills past 9, carry the 1 — the trick still flies.",
        "dare_line": "{prompt} — Bram did this one INSTANTLY too, even though the middle overflows. Suspicious, right?",
        "xp_reward": 80,
        "coin_reward": 40,
        "badge": {"id": "badge_times_11_carry", "name": "Times-11 Carry-On Captain", "icon": "🚀"},
        "reveal_example": {
            "prompt": "67 × 11 = ?",
            "answer": 737,
            "performance": [
                {"name": "Split", "text": "Pull 67 apart: 6 … 7."},
                {"name": "Add", "text": "6 + 7 = 13. Uh oh — 13 has two digits! It can't all fit in the middle."},
                {"name": "Carry the 1", "text": "The 3 stays in the middle. The 1 hops over and joins the 6, making 7."},
                {"name": "Read it", "text": "7 – 3 – 7. 67 × 11 = 737!"},
            ],
            "visual": {"type": "digit_split", "n": 67, "first": 7, "middle": 3,
                       "last": 7, "carry": 1, "raw_sum": 13},
        },
        "why": {
            "text": "Here's the pattern behind the pattern: 11 × 53 is just 53 × 10 + 53 — "
                    "that's 530 + 53. Line those up and the middle column is the digit sum. "
                    "When that column passes 9, the extra ten carries left, like any addition. "
                    "The trick was place value all along.",
            "probe": {
                "instruction": "Prove it with 53: enter 53 × 10 first, then the full 53 × 11. "
                               "See how the second one is just the first plus 53 more?",
                "given": {"n": 53},
                "input_labels": ["53 × 10", "53 × 11"],
                "wrong_hint": "53 × 10 just adds a zero. Then 53 × 11 is that plus one more 53.",
            },
        },
        "skins": [
            "A gardener plants 11 rows with {n} flowers in each row. How many flowers in all?",
            "11 buses each carry {n} passengers. How many passengers in total?",
        ],
        "teach_back": {
            "steps": [
                {"id": "split", "label": "Split the two digits apart"},
                {"id": "add", "label": "Add the digits — if the sum is 10 or more, it overflows"},
                {"id": "carry", "label": "Keep the ones digit in the middle and carry the 1 to the first digit"},
                {"id": "read", "label": "Read the answer"},
            ],
            "why_choices": [
                "Because the middle column is a normal addition column — sums past 9 carry, like always",
                "Because overflowing middles are just ignored",
                "Because 11 tricks stop working when digits are big",
            ],
            "why_correct": 0,
        },
    },
    {
        "id": "times_9",
        "order": 4,
        "name": "Times-9 Elevator",
        "icon": "🛗",
        "tagline": "Ride up to 10, then drop back one group. 9s are secretly 10s in disguise.",
        "dare_line": "Bram says {prompt} is EASY. Easy?! The 9 times table is supposed to be the scary one…",
        "xp_reward": 60,
        "coin_reward": 30,
        "badge": {"id": "badge_times_9", "name": "Times-9 Elevator Operator", "icon": "🛗"},
        "reveal_example": {
            "prompt": "9 × 7 = ?",
            "answer": 63,
            "performance": [
                {"name": "Ride up", "text": "Forget 9 for a second. Ride the elevator to 10: 10 × 7 = 70."},
                {"name": "One group too many", "text": "But 10 groups is one group MORE than 9 groups."},
                {"name": "Drop back", "text": "Drop back one group of 7: 70 − 7 = 63."},
                {"name": "Arrive", "text": "9 × 7 = 63. The elevator did the hard part!"},
            ],
            "visual": {"type": "ten_groups", "n": 7, "ten_product": 70, "answer": 63},
        },
        "why": {
            "text": "9 is just 10 wearing a disguise — it's exactly one group less. So any "
                    "9-times problem is a friendly 10-times problem with one group taken "
                    "away. This works for ANY size number, because 9 = 10 − 1, always.",
            "probe": {
                "instruction": "Does the elevator still work on a BIG number? Here is 46. "
                               "Enter 10 × 46, then 9 × 46 using the drop-back move.",
                "given": {"n": 46},
                "input_labels": ["10 × 46", "9 × 46"],
                "wrong_hint": "10 × 46 adds a zero. For 9 × 46, take away ONE group of 46 from that.",
            },
        },
        "skins": [
            "9 parrots each eat {n} seeds. How many seeds do they eat in all?",
            "There are 9 nests and each nest holds {n} eggs. How many eggs in total?",
        ],
        "teach_back": {
            "steps": [
                {"id": "up", "label": "Multiply by 10 instead — that's easy"},
                {"id": "notice", "label": "Notice you counted one group too many"},
                {"id": "drop", "label": "Subtract one group of the number"},
                {"id": "arrive", "label": "What remains is 9 times the number"},
            ],
            "why_choices": [
                "Because 9 is exactly one group less than 10, so ×10 minus one group equals ×9",
                "Because 9 and 10 are both round numbers",
                "Because subtracting always makes multiplication easier",
            ],
            "why_correct": 0,
        },
    },
    {
        "id": "bond_division",
        "order": 5,
        "name": "Bond-Split Division",
        "icon": "🍌",
        "tagline": "Split the big number into friendly parts the divisor loves, divide each, add.",
        "dare_line": "{prompt} — Bram split it and solved it before the bananas even landed. There's a splitting move to learn here.",
        "xp_reward": 80,
        "coin_reward": 40,
        "badge": {"id": "badge_bond_division", "name": "Bond-Split Divider", "icon": "🍌"},
        "reveal_example": {
            "prompt": "78 ÷ 6 = ?",
            "answer": 13,
            "performance": [
                {"name": "Choose the split", "text": "78 is clunky. But 6 loves 60 and 18! Split 78 into 60 + 18."},
                {"name": "Divide the parts", "text": "60 ÷ 6 = 10. 18 ÷ 6 = 3. Both came out clean!"},
                {"name": "Add the answers", "text": "10 + 3 = 13."},
                {"name": "Solved", "text": "78 ÷ 6 = 13 — you never had to wrestle the big number at all."},
            ],
            "visual": {"type": "bond_split", "dividend": 78, "divisor": 6,
                       "parts": [60, 18], "quotients": [10, 3], "answer": 13},
        },
        "why": {
            "text": "Division shares things equally — and sharing two smaller piles is the "
                    "same as sharing one big pile. So you may split the big number into ANY "
                    "parts you like, as long as each part divides cleanly. The art is picking "
                    "parts that are multiples of the divisor: friendly parts.",
            "probe": {
                "instruction": "Your turn to build the bond: split 96 for ÷ 8. Enter your two "
                               "friendly parts, then the answer to 96 ÷ 8. Both parts must be "
                               "multiples of 8!",
                "given": {"D": 96, "d": 8},
                "input_labels": ["Friendly part 1", "Friendly part 2", "96 ÷ 8"],
                "wrong_hint": "The parts must add to 96 AND both be in the 8 times table (8, 16, 24, 32 …).",
            },
        },
        "skins": [
            "{D} mangoes are shared equally into {d} baskets. How many mangoes in each basket?",
            "{D} explorers split into {d} equal teams. How many explorers on each team?",
        ],
        "teach_back": {
            "steps": [
                {"id": "choose", "label": "Choose a split where both parts are multiples of the divisor"},
                {"id": "divide", "label": "Divide each part by the divisor"},
                {"id": "add", "label": "Add the two part-answers together"},
            ],
            "why_choices": [
                "Because sharing two smaller piles equally gives the same result as sharing the one big pile",
                "Because division only works on small numbers",
                "Because the divisor disappears after the split",
            ],
            "why_correct": 0,
        },
    },
]

TECHNIQUES_BY_ID: Dict[str, dict] = {t["id"]: t for t in TECHNIQUES}


def technique_by_id(technique_id: str) -> Optional[dict]:
    return TECHNIQUES_BY_ID.get(technique_id)


def public_technique(technique: dict) -> dict:
    """Content a client may see in the technique trail (no solutions)."""
    return {
        "id": technique["id"],
        "order": technique["order"],
        "name": technique["name"],
        "icon": technique["icon"],
        "tagline": technique["tagline"],
        "badge": technique["badge"],
        "xp_reward": technique["xp_reward"],
        "coin_reward": technique["coin_reward"],
    }


def public_steps(problem: dict, include_hints: bool = True) -> List[dict]:
    """Scaffolded steps with expected values stripped."""
    steps = []
    for step in problem.get("steps", []):
        public = {"key": step["key"], "label": step["label"], "kind": step["kind"]}
        if step["kind"] == "choice":
            public["options"] = step["options"]
        if include_hints and step.get("hint"):
            public["hint"] = step["hint"]
        steps.append(public)
    return steps


def public_problem(problem: dict, include_steps: bool = False,
                   include_hints: bool = True) -> dict:
    public = {"prompt": problem["prompt"], "operation": problem["operation"]}
    if include_steps:
        public["steps"] = public_steps(problem, include_hints=include_hints)
    return public


def apply_skin(technique: dict, problem: dict, rng: random.Random) -> str:
    """Render a word-problem skin for a problem (Remix stage flavor)."""
    skins = technique.get("skins") or []
    if not skins:
        return problem["prompt"]
    template = rng.choice(skins)
    try:
        return template.format(**problem.get("operands", {}))
    except (KeyError, IndexError):
        return problem["prompt"]


# --------------------------------------------------------------------------
# Parent evidence: the full arc of one technique for one child.
# Pure aggregation over raw records so routers stay thin and this is
# unit-testable without a database.
# --------------------------------------------------------------------------

def summarize_technique_evidence(attempts: List[dict], mastery: Optional[dict],
                                 teach_back: Optional[dict], encores: List[dict],
                                 dares: List[dict]) -> dict:
    """Build the Encore & Exhibit arc for one technique.

    attempts: boss-gate attempt records for this technique.
    mastery: the mastery record or None.
    teach_back: the teach-back record or None.
    encores: encore records (any status).
    dares: dare records (first attempts at the technique) — the arc opener.
    """
    boss_attempts = len(attempts)
    best_correct = max((a.get("correct_count", 0) for a in attempts), default=0)
    best_total = max((a.get("total_questions", 0) for a in attempts), default=0)

    dare = None
    if dares:
        first = min(dares, key=lambda d: d.get("attempted_at"))
        dare = {
            "attempted": True,
            "answer_correct": bool(first.get("answer_correct")),
            "prediction": first.get("prediction"),
        }

    encore_arc = []
    for e in sorted(encores, key=lambda x: x.get("offset_days", 0)):
        encore_arc.append({
            "offset_days": e.get("offset_days"),
            "status": e.get("status", "scheduled"),
            "correct_count": e.get("correct_count"),
            "total_questions": e.get("total_questions"),
            "attempts": e.get("attempts", 0),
        })

    return {
        "attempts": boss_attempts,
        "total_questions": sum(a.get("total_questions", 0) for a in attempts),
        "total_correct": sum(a.get("correct_count", 0) for a in attempts),
        "best_correct": best_correct,
        "best_total": best_total,
        "passed": bool(mastery),
        "mastered": bool(mastery),
        "mastered_at": mastery.get("mastered_at") if mastery else None,
        "last_played": max((a.get("attempted_at") for a in attempts), default=None),
        "dare": dare,
        "teach_back": {
            "completed": bool(teach_back and teach_back.get("completed")),
            "attempts": teach_back.get("attempts", 0) if teach_back else 0,
        },
        "encores": encore_arc,
    }
