from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.models.quest import QuestCreate, Quest, QuestStep, QuestStepCreate
from app.models.reward import Cosmetic, Badge
from app.models.user import TokenData
from app.database import quests_collection, quest_steps_collection, cosmetics_collection
from app.utils.auth import get_current_admin
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/admin", tags=["admin"])

class CosmeticCreate(BaseModel):
    name: str
    category: str
    value: str
    description: str
    unlock_requirement: str
    coin_cost: int = 0
    image_url: Optional[str] = None

class BadgeCreate(BaseModel):
    name: str
    description: str
    icon: str
    category: str
    rarity: str = "common"

@router.post("/quests", response_model=Quest, status_code=status.HTTP_201_CREATED)
async def create_quest(quest_data: QuestCreate, current_user: TokenData = Depends(get_current_admin)):
    # Create quest
    quest_dict = quest_data.model_dump(exclude={"steps"})
    quest_dict["id"] = str(uuid.uuid4())
    quest_dict["created_at"] = datetime.utcnow()
    quest_dict["created_by"] = current_user.user_id
    quest_dict["is_active"] = True
    
    quests_collection.insert_one(quest_dict)
    
    # Create steps
    steps = []
    for step_data in quest_data.steps:
        step_dict = step_data.model_dump()
        step_dict["id"] = str(uuid.uuid4())
        step_dict["quest_id"] = quest_dict["id"]
        quest_steps_collection.insert_one(step_dict)
        steps.append(QuestStep(**step_dict))
    
    quest_dict["steps"] = steps
    return Quest(**quest_dict)

@router.put("/quests/{quest_id}", response_model=Quest)
async def update_quest(quest_id: str, quest_data: QuestCreate, current_user: TokenData = Depends(get_current_admin)):
    quest = quests_collection.find_one({"id": quest_id})
    if not quest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quest not found"
        )
    
    # Update quest
    update_dict = quest_data.model_dump(exclude={"steps"})
    quests_collection.update_one({"id": quest_id}, {"$set": update_dict})
    
    # Delete old steps
    quest_steps_collection.delete_many({"quest_id": quest_id})
    
    # Create new steps
    steps = []
    for step_data in quest_data.steps:
        step_dict = step_data.model_dump()
        step_dict["id"] = str(uuid.uuid4())
        step_dict["quest_id"] = quest_id
        quest_steps_collection.insert_one(step_dict)
        steps.append(QuestStep(**step_dict))
    
    updated_quest = quests_collection.find_one({"id": quest_id})
    updated_quest["steps"] = steps
    return Quest(**updated_quest)

@router.delete("/quests/{quest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quest(quest_id: str, current_user: TokenData = Depends(get_current_admin)):
    quest = quests_collection.find_one({"id": quest_id})
    if not quest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quest not found"
        )
    
    quests_collection.update_one({"id": quest_id}, {"$set": {"is_active": False}})
    return None

@router.post("/cosmetics", response_model=Cosmetic, status_code=status.HTTP_201_CREATED)
async def create_cosmetic(cosmetic_data: CosmeticCreate, current_user: TokenData = Depends(get_current_admin)):
    cosmetic_dict = cosmetic_data.model_dump()
    cosmetic_dict["id"] = str(uuid.uuid4())
    cosmetic_dict["created_at"] = datetime.utcnow()
    
    cosmetics_collection.insert_one(cosmetic_dict)
    return Cosmetic(**cosmetic_dict)

@router.get("/cosmetics", response_model=List[Cosmetic])
async def get_cosmetics(current_user: TokenData = Depends(get_current_admin)):
    cosmetics = list(cosmetics_collection.find())
    return [Cosmetic(**c) for c in cosmetics]