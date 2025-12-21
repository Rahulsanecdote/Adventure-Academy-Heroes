from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid

class StepProgress(BaseModel):
    step_id: str
    completed: bool = False
    attempts: int = 0
    completed_at: Optional[datetime] = None
    score: Optional[int] = None

class QuestProgressBase(BaseModel):
    child_id: str
    quest_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    current_step_index: int = 0
    steps_progress: List[StepProgress] = []
    total_attempts: int = 0
    hints_used: int = 0

class QuestProgressCreate(BaseModel):
    child_id: str
    quest_id: str

class QuestProgressInDB(QuestProgressBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
class QuestProgress(QuestProgressBase):
    id: str

class QuestProgressUpdate(BaseModel):
    current_step_index: Optional[int] = None
    completed_at: Optional[datetime] = None
    steps_progress: Optional[List[StepProgress]] = None
    total_attempts: Optional[int] = None
    hints_used: Optional[int] = None

class SkillMastery(BaseModel):
    skill_name: str
    subject: str
    total_xp: int = 0
    quests_completed: int = 0
    mastery_level: int = 1  # 1-5
    last_practiced: Optional[datetime] = None