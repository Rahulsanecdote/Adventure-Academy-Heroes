"""Server-validated math challenge flow (Phase 1).

For Math Jungle quests, quest completion is earned here — not by a bare
progress call. The server generates questions, keeps the answers, grades the
submission, records the attempt as skill evidence, and only then completes
the quest through the shared reward path (app.utils.rewards).
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
import uuid

from app.models.challenge import (
    ChallengeStartRequest, ChallengeStartResponse, ChallengeQuestionPublic,
    ChallengeSubmitRequest, ChallengeSubmitResponse, SkillEvidence,
    SkillEvidenceReport,
)
from app.models.progress import StepProgress
from app.models.user import TokenData
from app.database import (
    challenges_collection, attempts_collection, children_collection,
    quests_collection, quest_steps_collection, progress_collection,
)
from app.utils.auth import get_current_user
from app.utils.math_challenge import generate_questions, grade_questions, pass_threshold
from app.utils.rewards import award_quest_rewards

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

QUESTIONS_PER_CHALLENGE = 5


def _verify_child_access(child_id: str, current_user: TokenData) -> dict:
    child = children_collection.find_one({"id": child_id})
    if not child or (child["parent_id"] != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return child


def _is_challenge_quest(quest: dict) -> bool:
    return quest.get("world") == "math_jungle" and quest.get("subject") == "math"


def _ensure_progress(child_id: str, quest_id: str) -> dict:
    """Find or create the child's progress row for a quest (same shape as
    the classic start-quest flow)."""
    existing = progress_collection.find_one({"child_id": child_id, "quest_id": quest_id})
    if existing:
        return existing

    steps = list(quest_steps_collection.find({"quest_id": quest_id}).sort("step_order", 1))
    steps_progress = [StepProgress(step_id=step["id"]) for step in steps]
    progress_dict = {
        "id": str(uuid.uuid4()),
        "child_id": child_id,
        "quest_id": quest_id,
        "started_at": datetime.utcnow(),
        "current_step_index": 0,
        "steps_progress": [sp.model_dump() for sp in steps_progress],
        "total_attempts": 0,
        "hints_used": 0,
    }
    progress_collection.insert_one(progress_dict)
    return progress_dict


@router.post("/start", response_model=ChallengeStartResponse, status_code=status.HTTP_201_CREATED)
def start_challenge(data: ChallengeStartRequest, current_user: TokenData = Depends(get_current_user)):
    _verify_child_access(data.child_id, current_user)

    quest = quests_collection.find_one({"id": data.quest_id})
    if not quest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found")
    if not _is_challenge_quest(quest):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenges are only available for Math Jungle quests",
        )

    _ensure_progress(data.child_id, data.quest_id)

    questions = generate_questions(quest.get("difficulty", "easy"), count=QUESTIONS_PER_CHALLENGE)
    session = {
        "id": str(uuid.uuid4()),
        "child_id": data.child_id,
        "quest_id": data.quest_id,
        "questions": questions,
        "created_at": datetime.utcnow(),
        "submitted": False,
    }
    challenges_collection.insert_one(session)

    return ChallengeStartResponse(
        challenge_id=session["id"],
        quest_id=data.quest_id,
        total_questions=len(questions),
        questions=[
            ChallengeQuestionPublic(prompt=q["prompt"], operation=q["operation"])
            for q in questions
        ],
    )


@router.post("/{challenge_id}/submit", response_model=ChallengeSubmitResponse)
def submit_challenge(
    challenge_id: str,
    data: ChallengeSubmitRequest,
    current_user: TokenData = Depends(get_current_user),
):
    session = challenges_collection.find_one({"id": challenge_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    child = _verify_child_access(session["child_id"], current_user)

    if session.get("submitted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This challenge has already been submitted",
        )

    questions = session["questions"]
    flags = grade_questions(questions, data.answers)
    correct_count = sum(1 for f in flags if f)
    passed = correct_count >= pass_threshold(len(questions))

    # Record the attempt — this is the skill evidence parents see.
    attempts_collection.insert_one({
        "id": str(uuid.uuid4()),
        "child_id": session["child_id"],
        "quest_id": session["quest_id"],
        "challenge_id": challenge_id,
        "total_questions": len(questions),
        "correct_count": correct_count,
        "passed": passed,
        "attempted_at": datetime.utcnow(),
    })

    challenges_collection.update_one(
        {"id": challenge_id},
        {"$set": {"submitted": True, "correct_count": correct_count, "passed": passed}},
    )

    reward = None
    already_completed = False

    if passed:
        quest = quests_collection.find_one({"id": session["quest_id"]})
        progress = _ensure_progress(session["child_id"], session["quest_id"])

        if progress.get("completed_at"):
            already_completed = True
        else:
            progress_collection.update_one(
                {"id": progress["id"]},
                {"$set": {"completed_at": datetime.utcnow()}},
            )
            reward = award_quest_rewards(child, quest)

    return ChallengeSubmitResponse(
        challenge_id=challenge_id,
        quest_id=session["quest_id"],
        correct_count=correct_count,
        total_questions=len(questions),
        passed=passed,
        already_completed=already_completed,
        reward=reward,
    )


@router.get("/child/{child_id}/evidence", response_model=SkillEvidenceReport)
def get_skill_evidence(child_id: str, current_user: TokenData = Depends(get_current_user)):
    _verify_child_access(child_id, current_user)

    attempts = list(attempts_collection.find({"child_id": child_id}))
    by_quest: dict = {}
    for attempt in attempts:
        entry = by_quest.setdefault(attempt["quest_id"], {
            "quest_id": attempt["quest_id"],
            "attempts": 0,
            "total_questions": 0,
            "total_correct": 0,
            "last_played": None,
            "passed": False,
        })
        entry["attempts"] += 1
        entry["total_questions"] += attempt["total_questions"]
        entry["total_correct"] += attempt["correct_count"]
        if entry["last_played"] is None or attempt["attempted_at"] > entry["last_played"]:
            entry["last_played"] = attempt["attempted_at"]
        entry["passed"] = entry["passed"] or bool(attempt.get("passed"))

    evidence = []
    for quest_id, entry in by_quest.items():
        quest = quests_collection.find_one({"id": quest_id})
        evidence.append(SkillEvidence(
            quest_title=quest["title"] if quest else "Unknown quest",
            **entry,
        ))

    evidence.sort(key=lambda e: e.last_played or datetime.min, reverse=True)

    # Phase 3: fold in the Trick Academy arc (Dare -> Boss Gate -> teach-back
    # -> Encore retention) alongside the quest evidence.
    from app.routers.trick_academy import build_technique_evidence
    techniques = build_technique_evidence(child_id)

    return SkillEvidenceReport(quests=evidence, techniques=techniques)
