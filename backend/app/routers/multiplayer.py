"""Phase 2 multiplayer bridge between FastAPI and the Colyseus game server.

Two responsibilities, both keeping FastAPI as the authority:

1. ``POST /api/multiplayer/session-token`` — a parent (parent JWT required)
   exchanges their session for a short-lived (<=15 min) game token for one
   of *their* children. The Colyseus server verifies this token in onAuth
   with the same SECRET_KEY / HS256 algorithm, so no token = no room.

2. ``POST /api/multiplayer/boss-reward`` — internal endpoint the game
   server calls when a co-op boss is defeated. Guarded by a shared secret
   header (MULTIPLAYER_INTERNAL_SECRET). XP/coins are awarded HERE, through
   the shared reward path (app.utils.rewards) — the game server never
   writes progression itself.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from jose import jwt

from app.config import settings
from app.database import children_collection
from app.models.multiplayer import (
    BossRewardRequest, BossRewardResponse, BossRewardResult,
    SessionTokenRequest, SessionTokenResponse,
)
from app.models.user import TokenData
from app.utils.auth import get_current_parent
from app.utils.rewards import award_quest_rewards

router = APIRouter(prefix="/api/multiplayer", tags=["multiplayer"])

# Child age bands stored on profiles are finer-grained than room bands.
ROOM_AGE_BANDS = {
    "7-8": "7-9",
    "9-10": "10-12",
    "11-12": "10-12",
}

# Modest fixed reward for helping defeat the Math Jungle boss.
BOSS_XP_REWARD = 30
BOSS_COIN_REWARD = 15


def room_age_band(child_age_band: str) -> str:
    return ROOM_AGE_BANDS.get(child_age_band, "7-9")


@router.post("/session-token", response_model=SessionTokenResponse)
def create_session_token(
    body: SessionTokenRequest,
    current_user: TokenData = Depends(get_current_parent),
):
    child = children_collection.find_one({"id": body.child_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Child not found"
        )
    if child["parent_id"] != current_user.user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this child",
        )

    avatar = child.get("avatar") or {}
    band = room_age_band(child.get("age_band", ""))
    expire = datetime.utcnow() + timedelta(minutes=settings.game_token_expire_minutes)
    claims = {
        "type": "game",
        "child_id": child["id"],
        "display_name": child["username"],
        "age_band": band,
        "avatar": avatar,
        "exp": expire,
    }
    token = jwt.encode(claims, settings.secret_key, algorithm=settings.algorithm)

    return SessionTokenResponse(
        token=token,
        expires_in=settings.game_token_expire_minutes * 60,
        child_id=child["id"],
        display_name=child["username"],
        age_band=band,
        avatar=avatar,
    )


@router.post("/boss-reward", response_model=BossRewardResponse)
def boss_reward(
    body: BossRewardRequest,
    x_internal_secret: str = Header(default=""),
):
    if not settings.multiplayer_internal_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Boss rewards are not configured on this server",
        )
    if x_internal_secret != settings.multiplayer_internal_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal secret",
        )

    quest_like = {
        "xp_reward": BOSS_XP_REWARD,
        "coin_reward": BOSS_COIN_REWARD,
        "badge_id": None,
        "title": "Jungle Boss Victory",
        "subject": "math",
    }

    results = []
    # De-duplicate: a child is rewarded once per boss defeat.
    for child_id in dict.fromkeys(body.child_ids):
        child = children_collection.find_one({"id": child_id})
        if not child:
            results.append(BossRewardResult(
                child_id=child_id, awarded=False, detail="child not found"
            ))
            continue
        award = award_quest_rewards(child, quest_like)
        results.append(BossRewardResult(
            child_id=child_id,
            awarded=True,
            xp_earned=award["xp_earned"],
            coins_earned=award["coins_earned"],
        ))

    return BossRewardResponse(results=results)
