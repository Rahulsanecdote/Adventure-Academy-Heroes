from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

class AvatarCustomization(BaseModel):
    skin_tone: str = "light"
    hair_style: str = "short"
    hair_color: str = "brown"
    outfit: str = "casual_blue"
    accessory: Optional[str] = None

class ChildProfileBase(BaseModel):
    username: str
    age_band: Literal["7-8", "9-10", "11-12"]
    avatar: AvatarCustomization = Field(default_factory=AvatarCustomization)

class ChildProfileCreate(ChildProfileBase):
    parent_id: str

class ChildProfileInDB(ChildProfileBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parent_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_xp: int = 0
    level: int = 1
    coins: int = 0
    hint_buddy_enabled: bool = False
    
class ChildProfile(ChildProfileBase):
    id: str
    parent_id: str
    created_at: datetime
    total_xp: int
    level: int
    coins: int
    hint_buddy_enabled: bool

class ChildSession(BaseModel):
    child_id: str
    parent_id: str
    username: str
    access_token: str
    token_type: str = "bearer"