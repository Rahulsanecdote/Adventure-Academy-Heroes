"""Trick Academy API models (Phase 3 — "The Trick Academy Ascent").

The 7-stage flow is generic; everything technique-specific arrives as
content from app.utils.trick_challenge. Public problem shapes never carry
expected values — answers live only in server-side session documents.
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.models.reward import RewardCeremony


# ---------------------------------------------------------------- content

class TechniqueBadge(BaseModel):
    id: str
    name: str
    icon: str


class TechniquePublic(BaseModel):
    """A technique as shown in the Academy trail."""
    id: str
    order: int
    name: str
    icon: str
    tagline: str
    badge: TechniqueBadge
    xp_reward: int
    coin_reward: int
    status: str  # "locked" | "available" | "in_progress" | "mastered"
    mastered_at: Optional[datetime] = None


class StepPublic(BaseModel):
    key: str
    label: str
    kind: str  # "value" | "choice"
    options: Optional[List[Dict[str, Any]]] = None
    hint: Optional[str] = None


class ProblemPublic(BaseModel):
    prompt: str
    operation: str
    steps: Optional[List[StepPublic]] = None
    skin: Optional[str] = None        # word-problem rendering (Remix)
    mixed_technique: Optional[str] = None  # set on interleaved Remix problems


# ---------------------------------------------------------------- the Dare

class SessionCreateRequest(BaseModel):
    child_id: str
    technique_id: str


class DarePayload(BaseModel):
    prompt: str
    operation: str
    dare_line: str
    prediction_options: List[str]
    # Three tap-to-guess choices (the answer + two near misses, shuffled).
    # The 3-beat flow answers the Dare with one tap — no typing.
    answer_options: List[int] = []


class SessionCreateResponse(BaseModel):
    session_id: str
    technique_id: str
    stage: str
    dare: DarePayload


class DareSubmitRequest(BaseModel):
    answer: int
    # Index into PREDICTION_OPTIONS. Optional: the 3-beat flow dropped the
    # prediction-commitment form (too much friction for kids); older clients
    # may still send it, and it is recorded when present.
    prediction: Optional[int] = None


class PerformanceStep(BaseModel):
    name: str
    text: str


class RevealContent(BaseModel):
    prompt: str
    answer: int
    performance: List[PerformanceStep]
    visual: Optional[Dict[str, Any]] = None


class DareSubmitResponse(BaseModel):
    answer_correct: bool
    correct_answer: int
    prediction: Optional[int] = None
    stage: str
    reveal: RevealContent


# ---------------------------------------------------------------- the Reveal (mimic)

class MimicStartResponse(BaseModel):
    problem: ProblemPublic


class StepAnswersRequest(BaseModel):
    step_answers: List[int]


class StepResult(BaseModel):
    key: str
    correct: bool
    expected: int


class MimicSubmitResponse(BaseModel):
    step_results: List[StepResult]
    complete: bool
    stage: str
    why_lab: Optional["WhyLabPayload"] = None


# ---------------------------------------------------------------- the Why Lab

class ProbePublic(BaseModel):
    instruction: str
    given: Dict[str, Any] = {}
    input_labels: List[str]


class WhyLabPayload(BaseModel):
    why_text: str
    explorer_visual: Optional[Dict[str, Any]] = None
    probe: ProbePublic


class ProbeSubmitRequest(BaseModel):
    values: List[int]


class ProbeSubmitResponse(BaseModel):
    correct: bool
    hint: Optional[str] = None
    stage: str


# ---------------------------------------------------------------- Side-by-Side

class RepStartRequest(BaseModel):
    want_demo: bool = False  # "Watch the guide again" — inserts a do-along rep


class RepPayload(BaseModel):
    rep_id: str
    mode: str  # "along" | "solo"
    scaffold: str  # "full" | "steps_only" | "none"
    guide_demo: Optional[Dict[str, Any]] = None  # worked example for along reps
    problem: ProblemPublic
    consecutive_solo_correct: int
    solo_streak_needed: int


class RepSubmitRequest(BaseModel):
    rep_id: str
    step_answers: Optional[List[int]] = None  # along reps
    answer: Optional[int] = None              # solo reps


class RepSubmitResponse(BaseModel):
    mode: str
    correct: bool
    step_results: Optional[List[StepResult]] = None
    correct_answer: Optional[int] = None
    consecutive_solo_correct: int
    gate_passed: bool
    stage: str


# ---------------------------------------------------------------- the Remix

class RemixStartResponse(BaseModel):
    problems: List[ProblemPublic]
    total: int


class AnswersRequest(BaseModel):
    answers: List[int]


class RemixSubmitResponse(BaseModel):
    correct_count: int
    total_questions: int
    passed: bool
    per_problem: List[bool]
    stage: str


# ---------------------------------------------------------------- the Boss Gate

class BossStartResponse(BaseModel):
    problems: List[ProblemPublic]
    total_questions: int
    time_limit_seconds: int
    boss_name: str
    taunt: str


class BossSubmitResponse(BaseModel):
    correct_count: int
    total_questions: int
    passed: bool
    elapsed_seconds: float
    time_limit_seconds: int
    already_mastered: bool = False
    iteration_line: Optional[str] = None
    reward: Optional[RewardCeremony] = None
    stage: str


# ---------------------------------------------------------------- teach-back

class TeachBackStep(BaseModel):
    id: str
    label: str


class TeachBackPayload(BaseModel):
    technique_id: str
    steps: List[TeachBackStep]  # shuffled — the kid restores the order
    why_choices: List[str]
    completed: bool = False


class TeachBackSubmitRequest(BaseModel):
    child_id: str
    technique_id: str
    order: List[str]
    why_index: int


class TeachBackSubmitResponse(BaseModel):
    order_correct: bool
    why_correct: bool
    completed: bool
    attempts: int


# ---------------------------------------------------------------- encores

class EncorePublic(BaseModel):
    id: str
    technique_id: str
    technique_name: str
    icon: str
    offset_days: int
    due_at: datetime
    is_due: bool
    status: str  # "scheduled" | "due" | "completed" | "struggling"
    attempts: int = 0
    correct_count: Optional[int] = None
    total_questions: Optional[int] = None


class EncoreStartResponse(BaseModel):
    encore_id: str
    problems: List[ProblemPublic]
    total_questions: int


class EncoreSubmitResponse(BaseModel):
    correct_count: int
    total_questions: int
    passed: bool
    status: str


# ---------------------------------------------------------------- evidence

class DareArc(BaseModel):
    attempted: bool
    answer_correct: bool
    prediction: Optional[int] = None


class TeachBackArc(BaseModel):
    completed: bool
    attempts: int = 0


class EncoreArc(BaseModel):
    offset_days: int
    status: str
    correct_count: Optional[int] = None
    total_questions: Optional[int] = None
    attempts: int = 0


class TechniqueEvidence(BaseModel):
    """Per-technique mastery + the full Encore & Exhibit arc (Phase 3)."""
    technique_id: str
    technique_name: str
    icon: str
    attempts: int = 0            # Boss Gate attempts
    total_questions: int = 0
    total_correct: int = 0
    best_correct: int = 0
    best_total: int = 0
    passed: bool = False
    mastered: bool = False
    mastered_at: Optional[datetime] = None
    last_played: Optional[datetime] = None
    dare: Optional[DareArc] = None
    teach_back: TeachBackArc = TeachBackArc(completed=False)
    encores: List[EncoreArc] = []


# MimicSubmitResponse references WhyLabPayload before its definition above.
MimicSubmitResponse.model_rebuild()
