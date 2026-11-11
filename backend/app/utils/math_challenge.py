"""Server-side math challenge generation and grading (Phase 1).

Pure functions with no database or framework dependencies, so the challenge
logic can be unit-tested directly. Questions are generated on the server and
only the prompts ever leave the server; grading happens here too, so a
client can never award itself XP by asserting a result.
"""
import random
from typing import List, Optional

# (min, max) operand ranges per operation and difficulty
RANGES = {
    "easy": {
        "addition": (2, 20),
        "subtraction": (3, 20),
        "multiplication": (2, 5),
    },
    "medium": {
        "addition": (15, 99),
        "subtraction": (20, 99),
        "multiplication": (3, 9),
    },
    "hard": {
        "addition": (75, 499),
        "subtraction": (100, 499),
        "multiplication": (6, 12),
    },
}

OPERATIONS = ["addition", "subtraction", "multiplication"]

SYMBOLS = {"addition": "+", "subtraction": "-", "multiplication": "×"}


def generate_questions(difficulty: str, count: int = 5, rng: Optional[random.Random] = None) -> List[dict]:
    """Generate `count` questions: [{prompt, operation, answer}]."""
    rng = rng or random.Random()
    ranges = RANGES.get(difficulty, RANGES["easy"])

    questions = []
    for i in range(count):
        operation = OPERATIONS[i % len(OPERATIONS)]
        lo, hi = ranges[operation]
        a = rng.randint(lo, hi)
        b = rng.randint(lo, hi)

        if operation == "addition":
            answer = a + b
        elif operation == "subtraction":
            # Keep results non-negative for ages 7-12
            if b > a:
                a, b = b, a
            answer = a - b
        else:  # multiplication — second factor stays small
            b = rng.randint(2, max(3, min(hi, 9 if difficulty != "hard" else 12)))
            answer = a * b

        questions.append({
            "prompt": f"{a} {SYMBOLS[operation]} {b} = ?",
            "operation": operation,
            "answer": answer,
        })

    return questions


def grade_questions(questions: List[dict], answers: List[int]) -> List[bool]:
    """Return a per-question correct flag list."""
    flags = []
    for i, question in enumerate(questions):
        given = answers[i] if i < len(answers) else None
        flags.append(given == question["answer"])
    return flags


def pass_threshold(total: int) -> int:
    """Number of correct answers needed to pass (80%, rounded up)."""
    return -(-total * 4 // 5)  # ceil(0.8 * total)
