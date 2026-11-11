"""Phase 2 multiplayer models: game-session tokens and boss rewards."""
from pydantic import BaseModel, Field
from typing import List, Optional

from app.models.child import AvatarCustomization


class SessionTokenRequest(BaseModel):
    child_id: str


class SessionTokenResponse(BaseModel):
    token: str
    token_type: str = "game"
    expires_in: int  # seconds
    child_id: str
    display_name: str
    age_band: str  # room age band: "7-9" | "10-12"
    avatar: AvatarCustomization


class BossRewardRequest(BaseModel):
    child_ids: List[str] = Field(default_factory=list)
    source: str = "boss"


class BossRewardResult(BaseModel):
    child_id: str
    awarded: bool
    xp_earned: int = 0
    coins_earned: int = 0
    detail: Optional[str] = None


class BossRewardResponse(BaseModel):
    results: List[BossRewardResult]
