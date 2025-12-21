from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
import uuid

class CosmeticBase(BaseModel):
    name: str
    category: Literal["hair_style", "hair_color", "outfit", "accessory", "skin_tone"]
    value: str  # The actual value (e.g., "spiky", "red", "superhero_cape")
    description: str
    unlock_requirement: str  # Description like "Complete 5 Math quests"
    coin_cost: int = 0  # 0 means earned, not bought
    image_url: Optional[str] = None

class CosmeticInDB(CosmeticBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Cosmetic(CosmeticBase):
    id: str
    created_at: datetime

class BadgeBase(BaseModel):
    name: str
    description: str
    icon: str  # emoji or icon reference
    category: Literal["math", "coding", "science", "special"]
    rarity: Literal["common", "rare", "epic", "legendary"] = "common"

class BadgeInDB(BadgeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Badge(BadgeBase):
    id: str
    created_at: datetime

class InventoryItemBase(BaseModel):
    child_id: str
    item_type: Literal["cosmetic", "badge"]
    item_id: str
    earned_at: datetime = Field(default_factory=datetime.utcnow)
    is_equipped: bool = False

class InventoryItemInDB(InventoryItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class InventoryItem(InventoryItemBase):
    id: str
    item_details: Optional[dict] = None  # Populated with cosmetic/badge data

class RewardCeremony(BaseModel):
    quest_title: str
    xp_earned: int
    coins_earned: int
    badges: List[Badge] = []
    cosmetics: List[Cosmetic] = []
    new_level: Optional[int] = None
    total_xp: int
    total_coins: int