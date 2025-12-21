from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any
from app.models.progress import QuestProgress, QuestProgressCreate, QuestProgressUpdate, StepProgress, SkillMastery
from app.models.reward import RewardCeremony, Badge, Cosmetic
from app.models.user import TokenData
from app.database import (
    progress_collection, children_collection, quests_collection, 
    quest_steps_collection, inventory_collection, cosmetics_collection
)
from app.utils.auth import get_current_user
from datetime import datetime
import uuid
import math

router = APIRouter(prefix="/api/progress", tags=["progress"])

def calculate_level(xp: int) -> int:
    """Calculate level from XP (100 XP per level)"""
    return max(1, math.floor(xp / 100) + 1)

@router.post("/start-quest", response_model=QuestProgress, status_code=status.HTTP_201_CREATED)
async def start_quest(data: QuestProgressCreate, current_user: TokenData = Depends(get_current_user)):
    # Verify child access
    child = children_collection.find_one({"id": data.child_id})
    if not child or (child["parent_id"] != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Check if already started
    existing = progress_collection.find_one({"child_id": data.child_id, "quest_id": data.quest_id})
    if existing:
        return QuestProgress(**existing)
    
    # Get quest steps to initialize progress
    steps = list(quest_steps_collection.find({"quest_id": data.quest_id}).sort("step_order", 1))
    steps_progress = [StepProgress(step_id=step["id"]) for step in steps]
    
    progress_dict = {
        "id": str(uuid.uuid4()),
        "child_id": data.child_id,
        "quest_id": data.quest_id,
        "started_at": datetime.utcnow(),
        "current_step_index": 0,
        "steps_progress": [sp.model_dump() for sp in steps_progress],
        "total_attempts": 0,
        "hints_used": 0
    }
    
    progress_collection.insert_one(progress_dict)
    return QuestProgress(**progress_dict)

@router.patch("/{progress_id}", response_model=QuestProgress)
async def update_quest_progress(
    progress_id: str,
    update_data: QuestProgressUpdate,
    current_user: TokenData = Depends(get_current_user)
):
    progress = progress_collection.find_one({"id": progress_id})
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress not found"
        )
    
    # Verify access
    child = children_collection.find_one({"id": progress["child_id"]})
    if not child or (child["parent_id"] != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_data.steps_progress:
        update_dict["steps_progress"] = [sp.model_dump() for sp in update_data.steps_progress]
    
    progress_collection.update_one({"id": progress_id}, {"$set": update_dict})
    updated_progress = progress_collection.find_one({"id": progress_id})
    
    return QuestProgress(**updated_progress)

@router.post("/complete-quest/{progress_id}", response_model=RewardCeremony)
async def complete_quest(progress_id: str, current_user: TokenData = Depends(get_current_user)):
    progress = progress_collection.find_one({"id": progress_id})
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress not found"
        )
    
    # Verify access
    child = children_collection.find_one({"id": progress["child_id"]})
    if not child or (child["parent_id"] != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Get quest details
    quest = quests_collection.find_one({"id": progress["quest_id"]})
    if not quest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quest not found"
        )
    
    # Mark quest as completed
    progress_collection.update_one(
        {"id": progress_id},
        {"$set": {"completed_at": datetime.utcnow()}}
    )
    
    # Award XP and coins
    old_xp = child["total_xp"]
    old_level = child["level"]
    new_xp = old_xp + quest["xp_reward"]
    new_level = calculate_level(new_xp)
    new_coins = child["coins"] + quest["coin_reward"]
    
    children_collection.update_one(
        {"id": child["id"]},
        {"$set": {
            "total_xp": new_xp,
            "level": new_level,
            "coins": new_coins
        }}
    )
    
    # Award badge if applicable
    badges = []
    if quest.get("badge_id"):
        # Add badge to inventory
        inventory_item = {
            "id": str(uuid.uuid4()),
            "child_id": child["id"],
            "item_type": "badge",
            "item_id": quest["badge_id"],
            "earned_at": datetime.utcnow(),
            "is_equipped": False
        }
        inventory_collection.insert_one(inventory_item)
        
        # Mock badge data (will be replaced with actual badge system)
        badges.append(Badge(
            id=quest["badge_id"],
            name=f"{quest['title']} Master",
            description=f"Completed {quest['title']}",
            icon="🏆",
            category=quest["subject"],
            rarity="common",
            created_at=datetime.utcnow()
        ))
    
    return RewardCeremony(
        quest_title=quest["title"],
        xp_earned=quest["xp_reward"],
        coins_earned=quest["coin_reward"],
        badges=badges,
        cosmetics=[],
        new_level=new_level if new_level > old_level else None,
        total_xp=new_xp,
        total_coins=new_coins
    )

@router.get("/child/{child_id}", response_model=List[QuestProgress])
async def get_child_progress(child_id: str, current_user: TokenData = Depends(get_current_user)):
    # Verify access
    child = children_collection.find_one({"id": child_id})
    if not child or (child["parent_id"] != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    progress_list = list(progress_collection.find({"child_id": child_id}))
    return [QuestProgress(**p) for p in progress_list]

@router.get("/child/{child_id}/stats")
async def get_child_stats(child_id: str, current_user: TokenData = Depends(get_current_user)):
    # Verify access
    child = children_collection.find_one({"id": child_id})
    if not child or (child["parent_id"] != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    progress_list = list(progress_collection.find({"child_id": child_id}))
    completed_quests = [p for p in progress_list if p.get("completed_at")]
    
    # Calculate stats by subject
    stats_by_subject = {"math": 0, "coding": 0, "science": 0}
    for progress in completed_quests:
        quest = quests_collection.find_one({"id": progress["quest_id"]})
        if quest and quest["subject"] in stats_by_subject:
            stats_by_subject[quest["subject"]] += 1
    
    return {
        "child_id": child_id,
        "total_xp": child["total_xp"],
        "level": child["level"],
        "coins": child["coins"],
        "quests_completed": len(completed_quests),
        "quests_in_progress": len(progress_list) - len(completed_quests),
        "stats_by_subject": stats_by_subject
    }