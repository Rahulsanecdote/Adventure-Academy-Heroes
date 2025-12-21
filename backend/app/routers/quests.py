from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from app.models.quest import Quest, QuestWithProgress, QuestStep
from app.models.user import TokenData
from app.database import quests_collection, quest_steps_collection, progress_collection, children_collection
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/quests", tags=["quests"])

@router.get("", response_model=List[Quest])
async def get_quests(
    world: Optional[str] = None,
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: TokenData = Depends(get_current_user)
):
    query = {"is_active": True}
    if world:
        query["world"] = world
    if subject:
        query["subject"] = subject
    if difficulty:
        query["difficulty"] = difficulty
    
    quests = list(quests_collection.find(query))
    
    # Populate steps for each quest
    result = []
    for quest in quests:
        steps = list(quest_steps_collection.find({"quest_id": quest["id"]}).sort("step_order", 1))
        quest["steps"] = [QuestStep(**step) for step in steps]
        result.append(Quest(**quest))
    
    return result

@router.get("/child/{child_id}", response_model=List[QuestWithProgress])
async def get_quests_for_child(
    child_id: str,
    world: Optional[str] = None,
    current_user: TokenData = Depends(get_current_user)
):
    # Verify access to child
    child = children_collection.find_one({"id": child_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found"
        )
    
    if child["parent_id"] != current_user.user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this child's data"
        )
    
    # Get quests
    query = {"is_active": True}
    if world:
        query["world"] = world
    
    quests = list(quests_collection.find(query))
    
    # Get child's progress
    child_progress = {p["quest_id"]: p for p in progress_collection.find({"child_id": child_id})}
    
    # Get completed quest IDs
    completed_quest_ids = [qid for qid, p in child_progress.items() if p.get("completed_at")]
    
    result = []
    for quest in quests:
        steps = list(quest_steps_collection.find({"quest_id": quest["id"]}).sort("step_order", 1))
        quest["steps"] = [QuestStep(**step) for step in steps]
        
        progress = child_progress.get(quest["id"])
        is_completed = quest["id"] in completed_quest_ids
        
        # Check if locked (prerequisites not met)
        is_locked = False
        if quest.get("prerequisites"):
            is_locked = not all(prereq in completed_quest_ids for prereq in quest["prerequisites"])
        
        quest_with_progress = QuestWithProgress(
            **quest,
            progress=progress,
            is_completed=is_completed,
            is_locked=is_locked
        )
        result.append(quest_with_progress)
    
    return result

@router.get("/{quest_id}", response_model=Quest)
async def get_quest(quest_id: str, current_user: TokenData = Depends(get_current_user)):
    quest = quests_collection.find_one({"id": quest_id})
    if not quest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quest not found"
        )
    
    steps = list(quest_steps_collection.find({"quest_id": quest_id}).sort("step_order", 1))
    quest["steps"] = [QuestStep(**step) for step in steps]
    
    return Quest(**quest)

@router.get("/{quest_id}/steps", response_model=List[QuestStep])
async def get_quest_steps(quest_id: str, current_user: TokenData = Depends(get_current_user)):
    steps = list(quest_steps_collection.find({"quest_id": quest_id}).sort("step_order", 1))
    return [QuestStep(**step) for step in steps]