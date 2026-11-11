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
