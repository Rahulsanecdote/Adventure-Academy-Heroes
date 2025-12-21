from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime
import uuid

QuestStepType = Literal["math_puzzle", "code_puzzle", "science_sim", "dialogue", "collect"]

class QuestStepBase(BaseModel):
    step_order: int
    step_type: QuestStepType
    title: str
    description: str
    config: Dict[str, Any]  # Flexible config for each step type
    hints: List[str] = []
    xp_reward: int = 10

class QuestStepCreate(QuestStepBase):
    quest_id: str

class QuestStepInDB(QuestStepBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quest_id: str

class QuestStep(QuestStepBase):
    id: str
    quest_id: str

class QuestBase(BaseModel):
    title: str
    description: str
    world: Literal["math_jungle", "code_city", "science_spaceport"]
    subject: Literal["math", "coding", "science"]
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    age_range: List[str] = ["7-8", "9-10", "11-12"]
    estimated_minutes: int = 10
    xp_reward: int = 100
    coin_reward: int = 50
    badge_id: Optional[str] = None
    prerequisites: List[str] = []  # Quest IDs
    
class QuestCreate(QuestBase):
    steps: List[QuestStepBase] = []

class QuestInDB(QuestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str  # Admin user ID
    is_active: bool = True

class Quest(QuestBase):
    id: str
    created_at: datetime
    created_by: str
    is_active: bool
    steps: List[QuestStep] = []

class QuestWithProgress(Quest):
    progress: Optional[Dict[str, Any]] = None
    is_completed: bool = False
    is_locked: bool = False