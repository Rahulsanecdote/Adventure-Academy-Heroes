from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.models.reward import RewardCeremony


class ChallengeStartRequest(BaseModel):
    child_id: str
    quest_id: str


class ChallengeQuestionPublic(BaseModel):
    """A question as sent to the client — prompt only, never the answer."""
    prompt: str
    operation: str


class ChallengeStartResponse(BaseModel):
    challenge_id: str
    quest_id: str
    total_questions: int
    questions: List[ChallengeQuestionPublic]


class ChallengeSubmitRequest(BaseModel):
    answers: List[int]


class ChallengeSubmitResponse(BaseModel):
    challenge_id: str
    quest_id: str
    correct_count: int
    total_questions: int
    passed: bool
    already_completed: bool = False
    reward: Optional[RewardCeremony] = None


class SkillEvidence(BaseModel):
    """Per-quest learning evidence for the parent dashboard (Phase 1)."""
    quest_id: str
    quest_title: str
    attempts: int
    total_questions: int
    total_correct: int
    last_played: Optional[datetime] = None
    passed: bool = False


class SkillEvidenceReport(BaseModel):
    """The parent skill-evidence report (Phase 1, extended in Phase 3).

    `quests` is the original per-quest Math Challenge evidence; `techniques`
    adds the Trick Academy arc per technique (Dare -> Boss Gate -> teach-back
    -> Encore retention). The endpoint used to return a bare list of
    SkillEvidence; it now returns this wrapper — the frontend was updated in
    the same change.
    """
    quests: List[SkillEvidence]
    techniques: List["TechniqueEvidence"] = []


from app.models.trick import TechniqueEvidence  # noqa: E402  (report field type)

SkillEvidenceReport.model_rebuild()
