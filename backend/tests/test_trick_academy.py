"""Trick Academy (Phase 3) backend checks — stubbed-Mongo style, matching
the Phase 1/2 pattern (no live Mongo needed).

Run from the repo root with a Python that has fastapi/pydantic/httpx:

    PYTHONPATH=backend python backend/tests/test_trick_academy.py

Prints one line per check and a summary; exits non-zero on any failure.
Also collectable by pytest (checks are grouped in test_* functions).
"""
import os
import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

RESULTS = {"pass": 0, "fail": 0, "names": []}


def check(name, condition, extra=""):
    if condition:
        RESULTS["pass"] += 1
        print(f"  PASS  {name}")
    else:
        RESULTS["fail"] += 1
        RESULTS["names"].append(name)
        print(f"  FAIL  {name}  {extra}")


# --------------------------------------------------------------------------
# In-memory Mongo stand-ins
# --------------------------------------------------------------------------

class FakeCollection:
    def __init__(self):
        self.docs = []

    @staticmethod
    def _match(doc, filt):
        return all(doc.get(k) == v for k, v in (filt or {}).items())

    def find_one(self, filt=None):
        for doc in self.docs:
            if self._match(doc, filt):
                return doc
        return None

    def find(self, filt=None):
        return [d for d in self.docs if self._match(d, filt)]

    def insert_one(self, doc):
        self.docs.append(doc)
        return doc

    def update_one(self, filt, update):
        doc = self.find_one(filt)
        if doc is not None:
            doc.update(update.get("$set", {}))
        return doc


# --------------------------------------------------------------------------
# Pure engine checks
# --------------------------------------------------------------------------

def test_engine():
    print("\n== engine: generators ==")
    from app.utils import trick_challenge as tc

    bands = ["7-8", "9-10", "11-12"]
    rng = random.Random(20261111)

    for band in bands:
        for _ in range(300):
            p = tc.generate_problem("make_a_ten", band, rng)
            exp = [s["expected"] for s in p["steps"]]
            assert tc.steps_final_correct(p, exp)
            a, b = p["operands"]["a"], p["operands"]["b"]
            if p["answer"] != a + b:
                check(f"make_a_ten answer band={band}", False, str(p))
                return
        check(f"make_a_ten invariants band={band} (300 problems)", True)

    caps = {"7-8": 7, "9-10": 9, "11-12": 9}
    for band in bands:
        ok = True
        for _ in range(300):
            p = tc.generate_problem("times_11_basic", band, rng)
            n = p["operands"]["n"]
            f, l = divmod(n, 10)
            steps = {s["key"]: s["expected"] for s in p["steps"]}
            ok &= p["answer"] == 11 * n
            ok &= f + l <= caps[band]
            ok &= steps.get("first") == f and steps.get("middle") == f + l
            ok &= steps.get("answer") == 11 * n
        check(f"times_11_basic invariants + digit-sum cap band={band}", ok)

    for band in bands:
        ok = True
        for _ in range(300):
            p = tc.generate_problem("times_11_carry", band, rng)
            n = p["operands"]["n"]
            f, l = divmod(n, 10)
            ok &= p["answer"] == 11 * n
            if n < 100:
                steps = {s["key"]: s["expected"] for s in p["steps"]}
                ok &= f + l >= 10
                ok &= steps.get("first") == f + 1 and steps.get("middle") == (f + l) % 10
        check(f"times_11_carry invariants band={band}", ok)

    for band in bands:
        ok = True
        for _ in range(300):
            p = tc.generate_problem("times_9", band, rng)
            n = p["operands"]["n"]
            steps = {s["key"]: s["expected"] for s in p["steps"]}
            ok &= p["answer"] == 9 * n and steps.get("ten") == 10 * n and steps.get("answer") == 9 * n
        check(f"times_9 invariants band={band}", ok)

    for band in bands:
        ok = True
        for _ in range(300):
            p = tc.generate_problem("times_11_carry", band, rng, mastery=True)
            ok &= p["answer"] == 11 * p["operands"]["n"]
        check(f"times_11_carry mastery variants band={band}", ok)

    for band in bands:
        ok = True
        for _ in range(300):
            p = tc.generate_problem("bond_division", band, rng)
            d = p["operands"]["d"]
            dividend = p["operands"]["D"]
            ok &= d * p["answer"] == dividend
            choice = next(s for s in p["steps"] if s["kind"] == "choice")
            correct = choice["options"][choice["expected"]]
            p1, p2 = correct["parts"]
            ok &= p1 + p2 == dividend and p1 % d == 0 and p2 % d == 0
            for i, opt in enumerate(choice["options"]):
                if i != choice["expected"]:
                    ok &= not (opt["parts"][0] % d == 0 and opt["parts"][1] % d == 0)
            steps = {s["key"]: s.get("expected") for s in p["steps"]}
            ok &= steps.get("q1") == p1 // d
            ok &= steps.get("q2") == p2 // d
            ok &= steps.get("answer") == p["answer"]
        check(f"bond_division invariants band={band}", ok)

    print("\n== engine: probes / grading / thresholds ==")
    check("probe make_a_ten valid", tc.check_probe("make_a_ten", [8, 2]))
    check("probe make_a_ten invalid sum", not tc.check_probe("make_a_ten", [8, 3]))
    check("probe times_11_basic valid", tc.check_probe("times_11_basic", [64, 704]))
    check("probe times_11_basic invalid (sum<10)", not tc.check_probe("times_11_basic", [43, 473]))
    check("probe times_11_carry valid", tc.check_probe("times_11_carry", [530, 583]))
    check("probe times_11_carry invalid", not tc.check_probe("times_11_carry", [530, 584]))
    check("probe times_9 valid", tc.check_probe("times_9", [460, 414]))
    check("probe times_9 invalid", not tc.check_probe("times_9", [460, 415]))
    check("probe bond_division valid", tc.check_probe("bond_division", [40, 56, 12]))
    check("probe bond_division invalid part", not tc.check_probe("bond_division", [40, 55, 12]))
    check("probe wrong arity", not tc.check_probe("make_a_ten", [8]))

    steps = [{"key": "a", "expected": 1}, {"key": "b", "expected": 2}]
    problem = {"steps": steps}
    graded = tc.grade_steps(problem, [1, 99])
    check("grade_steps partial", graded[0]["correct"] and not graded[1]["correct"])
    check("steps_final_correct false", not tc.steps_final_correct(problem, [1, 99]))
    check("all_steps_correct true", tc.all_steps_correct(problem, [1, 2]))

    from app.utils.math_challenge import pass_threshold
    check("pass_threshold(6)==5 (Remix/Boss 80%)", pass_threshold(6) == 5)
    check("pass_threshold(3)==3 (why Encores use an explicit >=2 rule)", pass_threshold(3) == 3)

    print("\n== engine: evidence summary ==")
    now = datetime(2026, 11, 11, 12, 0, 0)
    summary = tc.summarize_technique_evidence(
        [{"correct_count": 5, "total_questions": 6, "passed": True, "attempted_at": now}],
        {"mastered_at": now},
        {"completed": True, "attempts": 2},
        [{"offset_days": 1, "status": "completed", "correct_count": 3, "total_questions": 3, "attempts": 1}],
        [{"answer_correct": False, "prediction": 1, "attempted_at": now}],
    )
    check("summary mastered", summary["mastered"] is True)
    check("summary best run", summary["best_correct"] == 5 and summary["best_total"] == 6)
    check("summary dare arc", summary["dare"]["attempted"] and summary["dare"]["answer_correct"] is False)
    check("summary teach-back arc", summary["teach_back"]["completed"] is True)
    check("summary encore arc", summary["encores"][0]["status"] == "completed")


# --------------------------------------------------------------------------
# API walk-through (stubbed collections + dependency override)
# --------------------------------------------------------------------------

def build_client():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.models.user import TokenData
    from app.utils.auth import get_current_user
    from app.routers import trick_academy as ta
    from app.routers import challenges as ch
    from app.utils import rewards as rw

    fakes = {
        "children": FakeCollection(),
        "sessions": FakeCollection(),
        "mastery": FakeCollection(),
        "attempts": FakeCollection(),
        "trick_attempts": FakeCollection(),
        "dares": FakeCollection(),
        "teachbacks": FakeCollection(),
        "encores": FakeCollection(),
        "quests": FakeCollection(),
        "inventory": FakeCollection(),
    }
    ta.children_collection = fakes["children"]
    ta.trick_sessions_collection = fakes["sessions"]
    ta.trick_mastery_collection = fakes["mastery"]
    ta.trick_attempts_collection = fakes["trick_attempts"]
    ta.trick_dares_collection = fakes["dares"]
    ta.trick_teachbacks_collection = fakes["teachbacks"]
    ta.trick_encores_collection = fakes["encores"]
    ch.children_collection = fakes["children"]
    ch.attempts_collection = fakes["attempts"]
    ch.quests_collection = fakes["quests"]
    rw.children_collection = fakes["children"]
    rw.inventory_collection = fakes["inventory"]

    app = FastAPI()
    app.include_router(ta.router)
    app.include_router(ch.router)
    state = {"user": TokenData(user_id="parent-1", role="parent")}
    app.dependency_overrides[get_current_user] = lambda: state["user"]
    return TestClient(app), fakes, state


def seed_child(fakes, child_id="child-1", parent_id="parent-1", band="7-8"):
    fakes["children"].insert_one({
        "id": child_id, "parent_id": parent_id, "age_band": band,
        "total_xp": 0, "level": 1, "coins": 0, "username": "Kid",
    })


def session_doc(fakes, session_id):
    return fakes["sessions"].find_one({"id": session_id})


def drive_to_boss(client, fakes, session_id, technique_probe):
    """Walk a fresh session through Why Lab + Side-by-Side into the Remix,
    then pass the Remix. Returns nothing; asserts via stage state."""
    doc = session_doc(fakes, session_id)
    # Why Lab probe
    r = client.post(f"/api/trick-academy/sessions/{session_id}/why/submit",
                    json={"values": technique_probe})
    assert r.status_code == 200 and r.json()["correct"], r.text
    # Side-by-Side until the gate passes
    for _ in range(20):
        r = client.post(f"/api/trick-academy/sessions/{session_id}/side-by-side/next",
                        json={"want_demo": False})
        assert r.status_code == 200, r.text
        rep = r.json()
        doc = session_doc(fakes, session_id)
        current = doc["sbs"]["current_rep"]["problem"]
        if rep["mode"] == "along":
            answers = [s["expected"] for s in current["steps"]]
            r = client.post(f"/api/trick-academy/sessions/{session_id}/side-by-side/submit",
                            json={"rep_id": rep["rep_id"], "step_answers": answers})
        else:
            r = client.post(f"/api/trick-academy/sessions/{session_id}/side-by-side/submit",
                            json={"rep_id": rep["rep_id"], "answer": current["answer"]})
        assert r.status_code == 200, r.text
        if r.json()["gate_passed"]:
            break
    else:
        raise AssertionError("side-by-side gate never passed")
    # Remix: answer everything from the stored set
    r = client.post(f"/api/trick-academy/sessions/{session_id}/remix/start", json={})
    assert r.status_code == 200, r.text
    doc = session_doc(fakes, session_id)
    answers = [e["problem"]["answer"] for e in doc["remix_problems"]]
    r = client.post(f"/api/trick-academy/sessions/{session_id}/remix/submit",
                    json={"answers": answers})
    assert r.status_code == 200 and r.json()["passed"], r.text


def start_and_dare(client, child_id, technique_id):
    r = client.post("/api/trick-academy/sessions",
                    json={"child_id": child_id, "technique_id": technique_id})
    assert r.status_code == 201, r.text
    session_id = r.json()["session_id"]
    r = client.post(f"/api/trick-academy/sessions/{session_id}/dare",
                    json={"answer": -1, "prediction": 1})
    assert r.status_code == 200, r.text
    return session_id


def test_api():
    print("\n== api: full Ascent walk-through (make_a_ten, band 7-8) ==")
    client, fakes, state = build_client()
    seed_child(fakes)

    r = client.get("/api/trick-academy/techniques", params={"child_id": "child-1"})
    techs = {t["id"]: t for t in r.json()}
    check("techniques list: first available", techs["make_a_ten"]["status"] == "available")
    check("techniques list: rest locked",
          all(techs[t]["status"] == "locked" for t in
              ["times_11_basic", "times_11_carry", "times_9", "bond_division"]))

    r = client.post("/api/trick-academy/sessions",
                    json={"child_id": "child-1", "technique_id": "times_11_basic"})
    check("locked technique session -> 400", r.status_code == 400)

    r = client.post("/api/trick-academy/sessions",
                    json={"child_id": "child-1", "technique_id": "make_a_ten"})
    check("session created", r.status_code == 201)
    body = r.json()
    check("dare payload carries no answer", "answer" not in body["dare"])
    check("no step expectations leak anywhere", '"expected"' not in r.text)
    session_id = body["session_id"]

    r = client.post(f"/api/trick-academy/sessions/{session_id}/dare",
                    json={"answer": -1, "prediction": 9})
    check("bad prediction index -> 400", r.status_code == 400)

    r = client.post(f"/api/trick-academy/sessions/{session_id}/why/submit",
                    json={"values": [8, 2]})
    check("stage enforcement: why before reveal -> 400", r.status_code == 400)

    r = client.post(f"/api/trick-academy/sessions/{session_id}/dare",
                    json={"answer": -1, "prediction": 1})
    check("dare submits + reveal returned", r.status_code == 200 and "reveal" in r.json())
    check("cold dare recorded as incorrect", r.json()["answer_correct"] is False)

    r = client.post(f"/api/trick-academy/sessions/{session_id}/reveal/mimic", json={})
    check("mimic problem issued", r.status_code == 200 and r.json()["problem"]["steps"])
    doc = session_doc(fakes, session_id)
    expected = [s["expected"] for s in doc["mimic_problem"]["steps"]]
    r = client.post(f"/api/trick-academy/sessions/{session_id}/reveal/mimic/submit",
                    json={"step_answers": [-1] * len(expected)})
    check("mimic wrong steps -> incomplete", r.json()["complete"] is False)
    r = client.post(f"/api/trick-academy/sessions/{session_id}/reveal/mimic/submit",
                    json={"step_answers": expected})
    check("mimic correct steps -> why lab", r.json()["complete"] is True and r.json()["why_lab"])

    r = client.post(f"/api/trick-academy/sessions/{session_id}/why/submit",
                    json={"values": [8, 3]})
    check("probe wrong -> hint, no advance", r.json()["correct"] is False and bool(r.json()["hint"]))

    drive_to_boss(client, fakes, session_id, [8, 2])
    doc = session_doc(fakes, session_id)
    check("side-by-side gate -> boss stage", doc["stage"] == "boss")

    r = client.post(f"/api/trick-academy/sessions/{session_id}/boss/start", json={})
    boss = r.json()
    check("boss set size/time for band 7-8",
          boss["total_questions"] == 6 and boss["time_limit_seconds"] == 120)
    doc = session_doc(fakes, session_id)
    answers = [p["answer"] for p in doc["boss_problems"]]
    xp_before = fakes["children"].find_one({"id": "child-1"})["total_xp"]
    r = client.post(f"/api/trick-academy/sessions/{session_id}/boss/submit",
                    json={"answers": answers})
    result = r.json()
    check("boss pass", result["passed"] is True)
    check("boss reward badge is the technique badge",
          result["reward"]["badges"][0]["id"] == "badge_make_a_ten")
    child = fakes["children"].find_one({"id": "child-1"})
    check("reward applied once (+50 XP / +25 coins)",
          child["total_xp"] - xp_before == 50 and child["coins"] == 25)
    check("mastery recorded", fakes["mastery"].find_one(
        {"child_id": "child-1", "technique_id": "make_a_ten"}) is not None)
    encores = fakes["encores"].find({"child_id": "child-1"})
    offsets = sorted(e["offset_days"] for e in encores)
    check("3 encores scheduled at +1/+3/+7", offsets == [1, 3, 7])
    mastered_at = fakes["mastery"].find_one(
        {"child_id": "child-1", "technique_id": "make_a_ten"})["mastered_at"]
    due_ok = all((e["due_at"] - mastered_at).days == e["offset_days"] for e in encores)
    check("encore due dates match offsets", due_ok)

    # Second full run: boss passes again but pays nothing twice.
    sid2 = start_and_dare(client, "child-1", "make_a_ten")
    client.post(f"/api/trick-academy/sessions/{sid2}/reveal/mimic", json={})
    doc2 = session_doc(fakes, sid2)
    expected = [s["expected"] for s in doc2["mimic_problem"]["steps"]]
    client.post(f"/api/trick-academy/sessions/{sid2}/reveal/mimic/submit",
                json={"step_answers": expected})
    drive_to_boss(client, fakes, sid2, [8, 2])
    client.post(f"/api/trick-academy/sessions/{sid2}/boss/start", json={})
    doc2 = session_doc(fakes, sid2)
    answers = [p["answer"] for p in doc2["boss_problems"]]
    xp_before = fakes["children"].find_one({"id": "child-1"})["total_xp"]
    r = client.post(f"/api/trick-academy/sessions/{sid2}/boss/submit",
                    json={"answers": answers})
    check("repeat boss pass flagged already_mastered", r.json()["already_mastered"] is True)
    check("repeat boss pass pays no second reward",
          fakes["children"].find_one({"id": "child-1"})["total_xp"] == xp_before
          and r.json()["reward"] is None)

    print("\n== api: teach-back ==")
    from app.utils.trick_challenge import technique_by_id
    correct_order = [s["id"] for s in technique_by_id("make_a_ten")["teach_back"]["steps"]]
    r = client.get("/api/trick-academy/child/child-1/teach-back/make_a_ten")
    payload = r.json()
    check("teach-back steps are shuffled", [s["id"] for s in payload["steps"]] != correct_order)
    r = client.post("/api/trick-academy/teach-back/submit", json={
        "child_id": "child-1", "technique_id": "make_a_ten",
        "order": list(reversed(correct_order)), "why_index": 0})
    check("teach-back wrong order -> incomplete", r.json()["completed"] is False)
    r = client.post("/api/trick-academy/teach-back/submit", json={
        "child_id": "child-1", "technique_id": "make_a_ten",
        "order": correct_order, "why_index": 0})
    check("teach-back correct -> completed", r.json()["completed"] is True)

    print("\n== api: encores ==")
    rows = {e["offset_days"]: e for e in fakes["encores"].find({"child_id": "child-1"})}
    rows[1]["due_at"] = datetime.utcnow() - timedelta(hours=1)
    r = client.get("/api/trick-academy/child/child-1/encores")
    due = [e for e in r.json() if e["is_due"]]
    check("past-due encore surfaces as due", len(due) == 1 and due[0]["offset_days"] == 1)
    encore_id = rows[1]["id"]
    r = client.post(f"/api/trick-academy/encores/{encore_id}/start", json={})
    check("encore starts with 3 problems", len(r.json()["problems"]) == 3)
    row = fakes["encores"].find_one({"id": encore_id})
    answers = [p["answer"] for p in row["active_problems"]]
    r = client.post(f"/api/trick-academy/encores/{encore_id}/submit", json={"answers": answers})
    check("encore pass (3/3) -> completed", r.json()["passed"] is True and r.json()["status"] == "completed")

    rows[3]["due_at"] = datetime.utcnow() - timedelta(hours=1)
    encore3 = rows[3]["id"]
    client.post(f"/api/trick-academy/encores/{encore3}/start", json={})
    r = client.post(f"/api/trick-academy/encores/{encore3}/submit",
                    json={"answers": [-1, -1, -1]})
    check("+3d encore miss -> quiet 'struggling' flag",
          r.json()["passed"] is False and r.json()["status"] == "struggling")

    print("\n== api: evidence (trick + combined report) ==")
    r = client.get("/api/trick-academy/child/child-1/evidence")
    ev = {e["technique_id"]: e for e in r.json()}
    check("evidence: make_a_ten mastered", ev["make_a_ten"]["mastered"] is True)
    check("evidence: dare arc present", ev["make_a_ten"]["dare"]["attempted"] is True)
    check("evidence: teach-back arc completed", ev["make_a_ten"]["teach_back"]["completed"] is True)
    statuses = {e["offset_days"]: e["status"] for e in ev["make_a_ten"]["encores"]}
    check("evidence: encore arc statuses",
          statuses.get(1) == "completed" and statuses.get(3) == "struggling")
    r = client.get("/api/challenges/child/child-1/evidence")
    report = r.json()
    check("combined report shape {quests, techniques}",
          set(report.keys()) == {"quests", "techniques"})
    check("combined report carries technique arc",
          report["techniques"][0]["technique_id"] == "make_a_ten"
          and report["techniques"][0]["mastered"] is True)

    print("\n== api: access control ==")
    state["user"] = state["user"].model_copy(update={"user_id": "parent-2"})
    r = client.get("/api/trick-academy/techniques", params={"child_id": "child-1"})
    check("other parent -> 403", r.status_code == 403)
    state["user"] = state["user"].model_copy(update={"user_id": "parent-1"})


def test_api_failure_paths():
    print("\n== api: boss failure routes back to remix ==")
    client, fakes, _ = build_client()
    seed_child(fakes, child_id="child-2", band="9-10")
    sid = start_and_dare(client, "child-2", "make_a_ten")
    client.post(f"/api/trick-academy/sessions/{sid}/reveal/mimic", json={})
    doc = session_doc(fakes, sid)
    expected = [s["expected"] for s in doc["mimic_problem"]["steps"]]
    client.post(f"/api/trick-academy/sessions/{sid}/reveal/mimic/submit",
                json={"step_answers": expected})
    drive_to_boss(client, fakes, sid, [7, 3])
    client.post(f"/api/trick-academy/sessions/{sid}/boss/start", json={})
    doc = session_doc(fakes, sid)
    wrong = [p["answer"] + 1000 for p in doc["boss_problems"]]
    r = client.post(f"/api/trick-academy/sessions/{sid}/boss/submit", json={"answers": wrong})
    result = r.json()
    check("boss fail -> not passed", result["passed"] is False)
    check("boss fail -> stage returns to remix",
          result["stage"] == "remix" and session_doc(fakes, sid)["stage"] == "remix")
    check("boss fail -> iteration line, not a fail state", bool(result["iteration_line"]))
    check("boss attempt still recorded as evidence",
          len(fakes["trick_attempts"].find({"child_id": "child-2"})) == 1)

    print("\n== api: remix interleaves a mastered technique ==")
    client, fakes, _ = build_client()
    seed_child(fakes, child_id="child-3", band="7-8")
    fakes["mastery"].insert_one({
        "id": "m-x9", "child_id": "child-3", "technique_id": "times_9",
        "mastered_at": datetime.utcnow(), "attempts_to_master": 1,
    })
    sid = start_and_dare(client, "child-3", "make_a_ten")
    client.post(f"/api/trick-academy/sessions/{sid}/reveal/mimic", json={})
    doc = session_doc(fakes, sid)
    expected = [s["expected"] for s in doc["mimic_problem"]["steps"]]
    client.post(f"/api/trick-academy/sessions/{sid}/reveal/mimic/submit",
                json={"step_answers": expected})
    # drive_to_boss passes the remix; inspect the stored set afterwards
    drive_to_boss(client, fakes, sid, [9, 1])
    doc = session_doc(fakes, sid)
    mixed = [e for e in doc["remix_problems"] if e["technique_id"] != "make_a_ten"]
    check("remix contains exactly one interleaved problem", len(mixed) == 1)
    check("interleaved problem is the mastered times_9",
          mixed and mixed[0]["technique_id"] == "times_9")


def main():
    test_engine()
    test_api()
    test_api_failure_paths()
    print(f"\n==== {RESULTS['pass']} passed, {RESULTS['fail']} failed ====")
    if RESULTS["fail"]:
        print("Failing checks:")
        for name in RESULTS["names"]:
            print(f"  - {name}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
