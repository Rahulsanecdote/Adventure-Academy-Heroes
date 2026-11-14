"""Trick Academy flow (Phase 3 — "The Trick Academy Ascent").

A new area off the hub where kids learn techniques as nameable "moves".
Every technique runs the same 7-stage engine; all technique-specific
content (copy, examples, probes, skins, teach-back) lives in
app.utils.trick_challenge as data.

  1. The Dare        — POST /sessions, POST /sessions/{id}/dare
  2. The Reveal      — performance in the dare response, then a scaffolded
                       mimic rep: POST /sessions/{id}/reveal/mimic[/submit]
  3. The Why Lab     — POST /sessions/{id}/why/submit (probe verdict)
  4. Side-by-Side    — POST /sessions/{id}/side-by-side/next|submit;
                       gate = 3 consecutive unaided (solo) correct reps
  5. The Remix       — POST /sessions/{id}/remix/start|submit; gate >= 80%
  6. The Boss Gate   — POST /sessions/{id}/boss/start|submit; timed, target
                       technique only; a loss routes back to the Remix
  7. Encore & Exhibit— teach-back (step ordering + explanation choice),
                       spaced Encore re-tests at +1/+3/+7 days, and the
                       parent evidence arc (see routers/challenges.py,
                       which folds this into the skill-evidence report)

All grading is server-side, following the Phase 1 challenge pattern:
problems are generated here, expected values never leave the server, and
rewards are paid only through app.utils.rewards.
"""
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import (
    children_collection, trick_attempts_collection, trick_dares_collection,
    trick_encores_collection, trick_mastery_collection, trick_sessions_collection,
    trick_teachbacks_collection,
)
from app.models.trick import (
    AnswersRequest, BossStartResponse, BossSubmitResponse, DarePayload,
    DareSubmitRequest, DareSubmitResponse, EncorePublic, EncoreStartResponse,
    EncoreSubmitResponse, MimicStartResponse, MimicSubmitResponse,
    PerformanceStep, ProblemPublic, ProbeSubmitRequest, ProbeSubmitResponse,
    RemixStartResponse, RemixSubmitResponse, RepPayload, RepStartRequest,
    RepSubmitRequest, RepSubmitResponse, RevealContent, SessionCreateRequest,
    SessionCreateResponse, StepAnswersRequest, TeachBackPayload,
    TeachBackSubmitRequest, TeachBackSubmitResponse, TechniqueEvidence,
    TechniquePublic, WhyLabPayload, ProbePublic,
)
from app.models.user import TokenData
from app.utils.auth import get_current_user
from app.utils.math_challenge import pass_threshold
from app.utils.rewards import award_standalone_rewards
from app.utils.trick_challenge import (
    AGE_BANDS, BOSS_CONFIG, BOSS_ITERATION_LINE, BOSS_NAME, BOSS_TAUNTS,
    BOSS_TIME_GRACE_SECONDS, ENCORE_COUNT, ENCORE_OFFSETS_DAYS,
    PREDICTION_OPTIONS, REMIX_COUNT, SOLO_STREAK_TO_PASS, TECHNIQUES,
    all_steps_correct, apply_skin, check_probe, generate_problem, grade_steps,
    public_problem, public_steps, public_technique, steps_final_correct,
    summarize_technique_evidence, technique_by_id,
)

router = APIRouter(prefix="/api/trick-academy", tags=["trick-academy"])


# ---------------------------------------------------------------- helpers

def _verify_child_access(child_id: str, current_user: TokenData) -> dict:
    child = children_collection.find_one({"id": child_id})
    if not child or (child["parent_id"] != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return child


def _band(child: dict) -> str:
    band = child.get("age_band")
    return band if band in AGE_BANDS else "7-8"


def _mastered_ids(child_id: str) -> List[str]:
    return [m["technique_id"] for m in trick_mastery_collection.find({"child_id": child_id})]


def _status_for(technique: dict, mastered_ids: List[str], child_id: str) -> str:
    if technique["id"] in mastered_ids:
        return "mastered"
    order = technique["order"]
    previous = next((t for t in TECHNIQUES if t["order"] == order - 1), None)
    if previous is not None and previous["id"] not in mastered_ids:
        return "locked"
    active = trick_sessions_collection.find_one(
        {"child_id": child_id, "technique_id": technique["id"], "stage": {"$ne": "mastered"}}
    )
    return "in_progress" if active else "available"


def _get_session(session_id: str, current_user: TokenData) -> dict:
    session = trick_sessions_collection.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _verify_child_access(session["child_id"], current_user)
    return session


def _require_stage(session: dict, *stages: str):
    if session.get("stage") not in stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session is at stage '{session.get('stage')}', not {'/'.join(stages)}",
        )


def _set_stage(session_id: str, stage: str, **extra):
    update = {"stage": stage}
    update.update(extra)
    trick_sessions_collection.update_one({"id": session_id}, {"$set": update})


# ---------------------------------------------------------------- the trail

@router.get("/techniques", response_model=List[TechniquePublic])
def list_techniques(child_id: str, current_user: TokenData = Depends(get_current_user)):
    _verify_child_access(child_id, current_user)
    mastered_ids = _mastered_ids(child_id)
    mastery = {m["technique_id"]: m for m in trick_mastery_collection.find({"child_id": child_id})}

    result = []
    for technique in TECHNIQUES:
        public = public_technique(technique)
        public["status"] = _status_for(technique, mastered_ids, child_id)
        record = mastery.get(technique["id"])
        public["mastered_at"] = record.get("mastered_at") if record else None
        result.append(TechniquePublic(**public))
    return result


# ---------------------------------------------------------------- stage 1: the Dare

@router.post("/sessions", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_session(data: SessionCreateRequest, current_user: TokenData = Depends(get_current_user)):
    child = _verify_child_access(data.child_id, current_user)
    technique = technique_by_id(data.technique_id)
    if not technique:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technique not found")

    status_for = _status_for(technique, _mastered_ids(data.child_id), data.child_id)
    if status_for == "locked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This technique is locked — master the previous move first!",
        )

    band = _band(child)
    dare_problem = generate_problem(technique["id"], band)
    # Tap-to-guess choices for the Dare: the answer plus two plausible
    # near misses, shuffled. Kids tap one — no keyboard, no form.
    answer = dare_problem["answer"]
    wrongs = []
    for delta in (1, -1, 2, -2, 10, -10, 3, -3, 20, -20):
        candidate = answer + delta
        if candidate >= 0 and candidate != answer and candidate not in wrongs:
            wrongs.append(candidate)
        if len(wrongs) == 2:
            break
    answer_options = wrongs + [answer]
    random.shuffle(answer_options)
    session = {
        "id": str(uuid.uuid4()),
        "child_id": data.child_id,
        "technique_id": technique["id"],
        "age_band": band,
        "stage": "dare",
        "dare_problem": dare_problem,
        "created_at": datetime.utcnow(),
    }
    trick_sessions_collection.insert_one(session)

    return SessionCreateResponse(
        session_id=session["id"],
        technique_id=technique["id"],
        stage="dare",
        dare=DarePayload(
            prompt=dare_problem["prompt"],
            operation=dare_problem["operation"],
            dare_line=technique["dare_line"].format(prompt=dare_problem["prompt"].replace(" = ?", "")),
            prediction_options=PREDICTION_OPTIONS,
            answer_options=answer_options,
        ),
    )


@router.post("/sessions/{session_id}/dare", response_model=DareSubmitResponse)
def submit_dare(session_id: str, data: DareSubmitRequest,
                      current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "dare")
    if data.prediction is not None and not (0 <= data.prediction < len(PREDICTION_OPTIONS)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown prediction")

    problem = session["dare_problem"]
    correct = data.answer == problem["answer"]

    # The Dare is the opener of the parent evidence arc.
    trick_dares_collection.insert_one({
        "id": str(uuid.uuid4()),
        "child_id": session["child_id"],
        "technique_id": session["technique_id"],
        "session_id": session_id,
        "answer_correct": correct,
        "prediction": data.prediction,
        "attempted_at": datetime.utcnow(),
    })

    technique = technique_by_id(session["technique_id"])
    example = technique["reveal_example"]
    _set_stage(session_id, "reveal")

    return DareSubmitResponse(
        answer_correct=correct,
        correct_answer=problem["answer"],
        prediction=data.prediction,
        stage="reveal",
        reveal=RevealContent(
            prompt=example["prompt"],
            answer=example["answer"],
            performance=[PerformanceStep(**s) for s in example["performance"]],
            visual=example.get("visual"),
        ),
    )


# ---------------------------------------------------------------- stage 2: the Reveal (mimic)

@router.post("/sessions/{session_id}/reveal/mimic", response_model=MimicStartResponse)
def start_mimic(session_id: str, current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "reveal")

    problem = generate_problem(session["technique_id"], session["age_band"])
    trick_sessions_collection.update_one(
        {"id": session_id}, {"$set": {"mimic_problem": problem}}
    )
    return MimicStartResponse(problem=ProblemPublic(
        **public_problem(problem, include_steps=True, include_hints=True)
    ))


@router.post("/sessions/{session_id}/reveal/mimic/submit", response_model=MimicSubmitResponse)
def submit_mimic(session_id: str, data: StepAnswersRequest,
                       current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "reveal")
    problem = session.get("mimic_problem")
    if not problem:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start the mimic first")

    results = grade_steps(problem, data.step_answers)
    complete = all_steps_correct(problem, data.step_answers)

    why_lab = None
    stage = "reveal"
    if complete:
        # 3-beat flow: the Why Lab is no longer a gate. Finishing the guided
        # rep moves straight into the Play rounds (side-by-side); the why
        # payload still rides along so the client can offer it as an
        # optional "curious why?" peek. The probe endpoint stays live for
        # any surface that wants it.
        stage = "side_by_side"
        _set_stage(session_id, stage,
                   sbs={"reps_started": 0, "reps_completed": 0,
                        "consecutive_solo": 0, "last_solo_failed": False,
                        "alongs_done": 0, "current_rep": None, "gate_passed": False})
        why_lab = _why_lab_payload(session["technique_id"])

    return MimicSubmitResponse(
        step_results=results, complete=complete, stage=stage, why_lab=why_lab
    )


def _why_lab_payload(technique_id: str) -> WhyLabPayload:
    technique = technique_by_id(technique_id)
    why = technique["why"]
    return WhyLabPayload(
        why_text=why["text"],
        explorer_visual=technique["reveal_example"].get("visual"),
        probe=ProbePublic(
            instruction=why["probe"]["instruction"],
            given=why["probe"].get("given", {}),
            input_labels=why["probe"]["input_labels"],
        ),
    )


@router.get("/sessions/{session_id}/why", response_model=WhyLabPayload)
def get_why_lab(session_id: str, current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "why_lab")
    return _why_lab_payload(session["technique_id"])


# ---------------------------------------------------------------- stage 3: the Why Lab

@router.post("/sessions/{session_id}/why/submit", response_model=ProbeSubmitResponse)
def submit_probe(session_id: str, data: ProbeSubmitRequest,
                       current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "why_lab")

    correct = check_probe(session["technique_id"], data.values)
    if not correct:
        technique = technique_by_id(session["technique_id"])
        return ProbeSubmitResponse(
            correct=False,
            hint=technique["why"]["probe"]["wrong_hint"],
            stage="why_lab",
        )
    _set_stage(session_id, "side_by_side",
               sbs={"reps_started": 0, "reps_completed": 0,
                    "consecutive_solo": 0, "last_solo_failed": False,
                    "alongs_done": 0, "current_rep": None, "gate_passed": False})
    return ProbeSubmitResponse(correct=True, stage="side_by_side")


# ---------------------------------------------------------------- stage 4: Side-by-Side

def _guide_demo(technique_id: str, band: str) -> dict:
    """A fresh worked example — the guide 'does one' before an along rep."""
    problem = generate_problem(technique_id, band)
    steps = []
    for step in problem["steps"]:
        entry = {"label": step["label"], "value": step["expected"]}
        if step["kind"] == "choice":
            entry["label"] = step["label"] + f" → {step['options'][step['expected']]['label']}"
        steps.append(entry)
    return {"prompt": problem["prompt"], "steps": steps, "answer": problem["answer"]}


@router.post("/sessions/{session_id}/side-by-side/next", response_model=RepPayload)
def next_rep(session_id: str, data: RepStartRequest,
                   current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "side_by_side")
    sbs = session.get("sbs") or {}
    if sbs.get("gate_passed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Side-by-Side gate already passed — on to the Remix!")

    reps_completed = sbs.get("reps_completed", 0)
    if data.want_demo or reps_completed == 0 or sbs.get("last_solo_failed"):
        mode = "along"
    else:
        mode = "solo"
    # Hint fade: the first do-along carries full hints; later ones only steps.
    scaffold = "none"
    if mode == "along":
        scaffold = "full" if sbs.get("alongs_done", 0) == 0 else "steps_only"

    problem = generate_problem(session["technique_id"], session["age_band"])
    rep = {
        "rep_id": str(uuid.uuid4()),
        "mode": mode,
        "scaffold": scaffold,
        "problem": problem,
    }
    sbs["current_rep"] = rep
    sbs["reps_started"] = sbs.get("reps_started", 0) + 1
    trick_sessions_collection.update_one({"id": session_id}, {"$set": {"sbs": sbs}})

    public = public_problem(
        problem,
        include_steps=(mode == "along"),
        include_hints=(scaffold == "full"),
    )
    return RepPayload(
        rep_id=rep["rep_id"],
        mode=mode,
        scaffold=scaffold,
        guide_demo=_guide_demo(session["technique_id"], session["age_band"]) if mode == "along" else None,
        problem=ProblemPublic(**public),
        consecutive_solo_correct=sbs.get("consecutive_solo", 0),
        solo_streak_needed=SOLO_STREAK_TO_PASS,
    )


@router.post("/sessions/{session_id}/side-by-side/submit", response_model=RepSubmitResponse)
def submit_rep(session_id: str, data: RepSubmitRequest,
                     current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "side_by_side")
    sbs = session.get("sbs") or {}
    rep = sbs.get("current_rep")
    if not rep or rep["rep_id"] != data.rep_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown or stale rep")

    problem = rep["problem"]
    step_results = None
    correct_answer = None

    if rep["mode"] == "along":
        answers = data.step_answers or []
        step_results = grade_steps(problem, answers)
        correct = steps_final_correct(problem, answers)
    else:
        correct = data.answer is not None and data.answer == problem["answer"]
        correct_answer = problem["answer"]
        if correct:
            sbs["consecutive_solo"] = sbs.get("consecutive_solo", 0) + 1
            sbs["last_solo_failed"] = False
        else:
            sbs["consecutive_solo"] = 0
            sbs["last_solo_failed"] = True

    if rep["mode"] == "along":
        sbs["alongs_done"] = sbs.get("alongs_done", 0) + 1
    sbs["reps_completed"] = sbs.get("reps_completed", 0) + 1
    sbs["current_rep"] = None

    gate_passed = sbs.get("consecutive_solo", 0) >= SOLO_STREAK_TO_PASS
    sbs["gate_passed"] = gate_passed
    stage = "side_by_side"
    if gate_passed:
        stage = "remix"
        trick_sessions_collection.update_one(
            {"id": session_id}, {"$set": {"sbs": sbs, "stage": stage}}
        )
    else:
        trick_sessions_collection.update_one({"id": session_id}, {"$set": {"sbs": sbs}})

    return RepSubmitResponse(
        mode=rep["mode"],
        correct=correct,
        step_results=step_results,
        correct_answer=correct_answer,
        consecutive_solo_correct=sbs.get("consecutive_solo", 0),
        gate_passed=gate_passed,
        stage=stage,
    )


# ---------------------------------------------------------------- stage 5: the Remix

def _build_remix_set(session: dict) -> List[dict]:
    """Unseen variants of the target technique (escalated ranges + skins),
    plus one interleaved problem from a previously mastered technique."""
    rng = random.Random()
    technique = technique_by_id(session["technique_id"])
    band = session["age_band"]

    mastered_others = [tid for tid in _mastered_ids(session["child_id"])
                       if tid != session["technique_id"]]
    interleave_id: Optional[str] = None
    if mastered_others:
        by_order = {t["id"]: t["order"] for t in TECHNIQUES}
        interleave_id = max(mastered_others, key=lambda tid: by_order.get(tid, 0))

    problems = []
    seen_prompts = set()
    target_count = REMIX_COUNT - (1 if interleave_id else 0)
    for i in range(target_count):
        problem = generate_problem(session["technique_id"], band, rng=rng, mastery=True)
        for _ in range(10):  # no duplicate prompts inside one Remix set
            if problem["prompt"] not in seen_prompts:
                break
            problem = generate_problem(session["technique_id"], band, rng=rng, mastery=True)
        seen_prompts.add(problem["prompt"])
        entry = {"technique_id": session["technique_id"], "problem": problem, "skin": None}
        if i % 2 == 0:  # roughly half wear a word-problem skin
            entry["skin"] = apply_skin(technique, problem, rng)
        problems.append(entry)

    if interleave_id:
        problem = generate_problem(interleave_id, band, rng=rng)
        problems.append({"technique_id": interleave_id, "problem": problem, "skin": None})
        rng.shuffle(problems)

    return problems


@router.post("/sessions/{session_id}/remix/start", response_model=RemixStartResponse)
def start_remix(session_id: str, current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "remix")

    problems = _build_remix_set(session)
    trick_sessions_collection.update_one(
        {"id": session_id},
        {"$set": {"remix_problems": problems, "remix_submitted": False}},
    )

    public = []
    for entry in problems:
        item = public_problem(entry["problem"])
        if entry.get("skin"):
            item["skin"] = entry["skin"]
        if entry["technique_id"] != session["technique_id"]:
            item["mixed_technique"] = technique_by_id(entry["technique_id"])["name"]
        public.append(ProblemPublic(**item))
    return RemixStartResponse(problems=public, total=len(public))


@router.post("/sessions/{session_id}/remix/submit", response_model=RemixSubmitResponse)
def submit_remix(session_id: str, data: AnswersRequest,
                       current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "remix")
    problems = session.get("remix_problems")
    if not problems or session.get("remix_submitted"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Start the Remix first (or this set was already submitted)")

    flags = []
    for i, entry in enumerate(problems):
        given = data.answers[i] if i < len(data.answers) else None
        flags.append(given == entry["problem"]["answer"])
    correct_count = sum(1 for f in flags if f)
    passed = correct_count >= pass_threshold(len(problems))

    update = {"remix_submitted": True}
    stage = "remix"
    if passed:
        stage = "boss"
        update["stage"] = stage
    trick_sessions_collection.update_one({"id": session_id}, {"$set": update})

    return RemixSubmitResponse(
        correct_count=correct_count, total_questions=len(problems),
        passed=passed, per_problem=flags, stage=stage,
    )


# ---------------------------------------------------------------- stage 6: the Boss Gate

@router.post("/sessions/{session_id}/boss/start", response_model=BossStartResponse)
def start_boss(session_id: str, current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "boss")

    config = BOSS_CONFIG.get(session["age_band"], BOSS_CONFIG["7-8"])
    rng = random.Random()
    problems = []
    seen_prompts = set()
    for _ in range(config["count"]):
        problem = generate_problem(session["technique_id"], session["age_band"],
                                   rng=rng, mastery=True)
        for _ in range(20):  # a boss never asks the same question twice
            if problem["prompt"] not in seen_prompts:
                break
            problem = generate_problem(session["technique_id"], session["age_band"],
                                       rng=rng, mastery=True)
        seen_prompts.add(problem["prompt"])
        problems.append(problem)
    time_limit = config["count"] * config["seconds_per_problem"]

    trick_sessions_collection.update_one(
        {"id": session_id},
        {"$set": {"boss_problems": problems,
                  "boss_started_at": datetime.utcnow(),
                  "boss_time_limit": time_limit}},
    )
    return BossStartResponse(
        problems=[ProblemPublic(**public_problem(p)) for p in problems],
        total_questions=len(problems),
        time_limit_seconds=time_limit,
        boss_name=BOSS_NAME,
        taunt=random.choice(BOSS_TAUNTS),
    )


@router.post("/sessions/{session_id}/boss/submit", response_model=BossSubmitResponse)
def submit_boss(session_id: str, data: AnswersRequest,
                      current_user: TokenData = Depends(get_current_user)):
    session = _get_session(session_id, current_user)
    _require_stage(session, "boss")
    problems = session.get("boss_problems")
    started_at = session.get("boss_started_at")
    if not problems or not started_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start the Boss Gate first")

    time_limit = session.get("boss_time_limit", 0)
    elapsed = (datetime.utcnow() - started_at).total_seconds()

    flags = []
    for i, problem in enumerate(problems):
        given = data.answers[i] if i < len(data.answers) else None
        flags.append(given == problem["answer"])
    correct_count = sum(1 for f in flags if f)
    in_time = elapsed <= time_limit + BOSS_TIME_GRACE_SECONDS
    passed = correct_count >= pass_threshold(len(problems)) and in_time

    # Every Boss Gate attempt is evidence, win or lose.
    trick_attempts_collection.insert_one({
        "id": str(uuid.uuid4()),
        "child_id": session["child_id"],
        "technique_id": session["technique_id"],
        "session_id": session_id,
        "total_questions": len(problems),
        "correct_count": correct_count,
        "passed": passed,
        "elapsed_seconds": elapsed,
        "attempted_at": datetime.utcnow(),
    })

    child = children_collection.find_one({"id": session["child_id"]})
    technique = technique_by_id(session["technique_id"])
    already = trick_mastery_collection.find_one(
        {"child_id": session["child_id"], "technique_id": session["technique_id"]}
    ) is not None

    reward = None
    if passed:
        _set_stage(session_id, "mastered")
        if not already:
            now = datetime.utcnow()
            trick_mastery_collection.insert_one({
                "id": str(uuid.uuid4()),
                "child_id": session["child_id"],
                "technique_id": session["technique_id"],
                "mastered_at": now,
                "session_id": session_id,
            })
            # Stage 7 scheduling: Encore re-tests at +1 / +3 / +7 days.
            for offset in ENCORE_OFFSETS_DAYS:
                trick_encores_collection.insert_one({
                    "id": str(uuid.uuid4()),
                    "child_id": session["child_id"],
                    "technique_id": session["technique_id"],
                    "offset_days": offset,
                    "due_at": now + timedelta(days=offset),
                    "status": "scheduled",
                    "attempts": 0,
                    "correct_count": None,
                    "total_questions": None,
                    "created_at": now,
                })
            reward = award_standalone_rewards(
                child,
                title=technique["name"],
                xp_reward=technique["xp_reward"],
                coin_reward=technique["coin_reward"],
                badge_id=technique["badge"]["id"],
                badge_name=technique["badge"]["name"],
                badge_description=f"Mastered the {technique['name']} move at the Boss Gate",
                badge_icon=technique["badge"]["icon"],
                category="math",
            )
        stage = "mastered"
    else:
        # Rober-style iteration: a loss routes back to the Remix, never to
        # the start of the technique.
        _set_stage(session_id, "remix", boss_problems=None, boss_started_at=None)
        stage = "remix"

    return BossSubmitResponse(
        correct_count=correct_count,
        total_questions=len(problems),
        passed=passed,
        elapsed_seconds=elapsed,
        time_limit_seconds=time_limit,
        already_mastered=already and passed,
        iteration_line=None if passed else BOSS_ITERATION_LINE,
        reward=reward,
        stage=stage,
    )


# ---------------------------------------------------------------- stage 7a: teach-back

@router.get("/child/{child_id}/teach-back/{technique_id}", response_model=TeachBackPayload)
def get_teach_back(child_id: str, technique_id: str,
                         current_user: TokenData = Depends(get_current_user)):
    _verify_child_access(child_id, current_user)
    technique = technique_by_id(technique_id)
    if not technique:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technique not found")
    if not trick_mastery_collection.find_one({"child_id": child_id, "technique_id": technique_id}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Teach-back unlocks after Boss Gate mastery")

    record = trick_teachbacks_collection.find_one(
        {"child_id": child_id, "technique_id": technique_id}
    )
    steps = list(technique["teach_back"]["steps"])
    # Deterministic-but-scrambled order per child+technique (stable across
    # visits so a half-finished teach-back looks the same when they return).
    seed = abs(hash(f"{child_id}:{technique_id}")) % (2 ** 31)
    random.Random(seed).shuffle(steps)
    if [s["id"] for s in steps] == [s["id"] for s in technique["teach_back"]["steps"]]:
        steps.reverse()  # never hand back the already-correct order

    return TeachBackPayload(
        technique_id=technique_id,
        steps=steps,
        why_choices=technique["teach_back"]["why_choices"],
        completed=bool(record and record.get("completed")),
    )


@router.post("/teach-back/submit", response_model=TeachBackSubmitResponse)
def submit_teach_back(data: TeachBackSubmitRequest,
                            current_user: TokenData = Depends(get_current_user)):
    _verify_child_access(data.child_id, current_user)
    technique = technique_by_id(data.technique_id)
    if not technique:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technique not found")
    if not trick_mastery_collection.find_one(
            {"child_id": data.child_id, "technique_id": data.technique_id}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Teach-back unlocks after Boss Gate mastery")

    correct_order = [s["id"] for s in technique["teach_back"]["steps"]]
    order_correct = data.order == correct_order
    why_correct = data.why_index == technique["teach_back"]["why_correct"]
    completed_now = order_correct and why_correct

    record = trick_teachbacks_collection.find_one(
        {"child_id": data.child_id, "technique_id": data.technique_id}
    )
    attempts = (record.get("attempts", 0) if record else 0) + 1
    completed = completed_now or bool(record and record.get("completed"))
    doc = {
        "child_id": data.child_id,
        "technique_id": data.technique_id,
        "attempts": attempts,
        "completed": completed,
        "updated_at": datetime.utcnow(),
    }
    if record:
        trick_teachbacks_collection.update_one({"id": record["id"]}, {"$set": doc})
    else:
        doc["id"] = str(uuid.uuid4())
        trick_teachbacks_collection.insert_one(doc)

    return TeachBackSubmitResponse(
        order_correct=order_correct, why_correct=why_correct,
        completed=completed, attempts=attempts,
    )


# ---------------------------------------------------------------- stage 7b: encores

def _encore_public(encore: dict) -> EncorePublic:
    technique = technique_by_id(encore["technique_id"])
    is_due = encore["status"] != "completed" and encore["due_at"] <= datetime.utcnow()
    return EncorePublic(
        id=encore["id"],
        technique_id=encore["technique_id"],
        technique_name=technique["name"] if technique else "Unknown technique",
        icon=technique["icon"] if technique else "🎓",
        offset_days=encore["offset_days"],
        due_at=encore["due_at"],
        is_due=is_due,
        status="due" if is_due and encore["status"] == "scheduled" else encore["status"],
        attempts=encore.get("attempts", 0),
        correct_count=encore.get("correct_count"),
        total_questions=encore.get("total_questions"),
    )


@router.get("/child/{child_id}/encores", response_model=List[EncorePublic])
def list_encores(child_id: str, current_user: TokenData = Depends(get_current_user)):
    _verify_child_access(child_id, current_user)
    encores = list(trick_encores_collection.find({"child_id": child_id}))
    encores.sort(key=lambda e: (e["due_at"]))
    return [_encore_public(e) for e in encores]


@router.post("/encores/{encore_id}/start", response_model=EncoreStartResponse)
def start_encore(encore_id: str, current_user: TokenData = Depends(get_current_user)):
    encore = trick_encores_collection.find_one({"id": encore_id})
    if not encore:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encore not found")
    child = _verify_child_access(encore["child_id"], current_user)
    if encore["status"] == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Encore already completed")

    problems = [generate_problem(encore["technique_id"], _band(child))
                for _ in range(ENCORE_COUNT)]
    trick_encores_collection.update_one(
        {"id": encore_id}, {"$set": {"active_problems": problems}}
    )
    return EncoreStartResponse(
        encore_id=encore_id,
        problems=[ProblemPublic(**public_problem(p)) for p in problems],
        total_questions=len(problems),
    )


@router.post("/encores/{encore_id}/submit", response_model=EncoreSubmitResponse)
def submit_encore(encore_id: str, data: AnswersRequest,
                        current_user: TokenData = Depends(get_current_user)):
    encore = trick_encores_collection.find_one({"id": encore_id})
    if not encore:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encore not found")
    _verify_child_access(encore["child_id"], current_user)
    problems = encore.get("active_problems")
    if not problems:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start the Encore first")

    flags = []
    for i, problem in enumerate(problems):
        given = data.answers[i] if i < len(data.answers) else None
        flags.append(given == problem["answer"])
    correct_count = sum(1 for f in flags if f)
    passed = correct_count >= 2  # 2 of 3 = retained

    attempts = encore.get("attempts", 0) + 1
    new_status = "completed" if passed else (
        "struggling" if encore["offset_days"] == 3 else encore["status"]
    )
    # A missed +3-day Encore flags the technique for a quiet Remix return —
    # visible to parents in the evidence pack, never a kid-facing fail state.
    trick_encores_collection.update_one(
        {"id": encore_id},
        {"$set": {
            "status": new_status,
            "attempts": attempts,
            "correct_count": correct_count,
            "total_questions": len(problems),
            "active_problems": None,
            "last_attempt_at": datetime.utcnow(),
        }},
    )
    return EncoreSubmitResponse(
        correct_count=correct_count, total_questions=len(problems),
        passed=passed, status=new_status,
    )


# ---------------------------------------------------------------- stage 7c: evidence

def build_technique_evidence(child_id: str) -> List[TechniqueEvidence]:
    """The Encore & Exhibit arc for every technique, for the parent report."""
    attempts = list(trick_attempts_collection.find({"child_id": child_id}))
    mastery = {m["technique_id"]: m for m in trick_mastery_collection.find({"child_id": child_id})}
    teachbacks = {t["technique_id"]: t for t in trick_teachbacks_collection.find({"child_id": child_id})}
    encores = list(trick_encores_collection.find({"child_id": child_id}))
    dares = list(trick_dares_collection.find({"child_id": child_id}))

    evidence = []
    for technique in TECHNIQUES:
        tid = technique["id"]
        summary = summarize_technique_evidence(
            [a for a in attempts if a["technique_id"] == tid],
            mastery.get(tid),
            teachbacks.get(tid),
            [e for e in encores if e["technique_id"] == tid],
            [d for d in dares if d["technique_id"] == tid],
        )
        evidence.append(TechniqueEvidence(
            technique_id=tid,
            technique_name=technique["name"],
            icon=technique["icon"],
            **summary,
        ))
    return evidence


@router.get("/child/{child_id}/evidence", response_model=List[TechniqueEvidence])
def get_technique_evidence(child_id: str, current_user: TokenData = Depends(get_current_user)):
    _verify_child_access(child_id, current_user)
    return build_technique_evidence(child_id)
