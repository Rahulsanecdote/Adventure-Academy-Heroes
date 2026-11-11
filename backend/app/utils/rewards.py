"""Shared quest reward logic (Phase 1 refactor).

Extracted from routers/progress.py so the server-validated challenge flow
(routers/challenges.py) awards XP/coins through exactly the same code path
as the classic progress flow.
"""
import math
import uuid
from datetime import datetime

from app.database import children_collection, inventory_collection


def calculate_level(xp: int) -> int:
    """Calculate level from XP (100 XP per level)"""
    return max(1, math.floor(xp / 100) + 1)


def award_quest_rewards(child: dict, quest: dict) -> dict:
    """Apply a quest's XP/coin rewards to a child and record any badge.

    Returns a RewardCeremony-shaped dict (badges as plain dicts).
    """
    old_level = child["level"]
    new_xp = child["total_xp"] + quest["xp_reward"]
    new_level = calculate_level(new_xp)
    new_coins = child["coins"] + quest["coin_reward"]

    children_collection.update_one(
        {"id": child["id"]},
        {"$set": {
            "total_xp": new_xp,
            "level": new_level,
            "coins": new_coins,
        }},
    )

    badges = []
    if quest.get("badge_id"):
        inventory_collection.insert_one({
            "id": str(uuid.uuid4()),
            "child_id": child["id"],
            "item_type": "badge",
            "item_id": quest["badge_id"],
            "earned_at": datetime.utcnow(),
            "is_equipped": False,
        })
        badges.append({
            "id": quest["badge_id"],
            "name": f"{quest['title']} Master",
            "description": f"Completed {quest['title']}",
            "icon": "🏆",
            "category": quest["subject"],
            "rarity": "common",
            "created_at": datetime.utcnow(),
        })

    return {
        "quest_title": quest["title"],
        "xp_earned": quest["xp_reward"],
        "coins_earned": quest["coin_reward"],
        "badges": badges,
        "cosmetics": [],
        "new_level": new_level if new_level > old_level else None,
        "total_xp": new_xp,
        "total_coins": new_coins,
    }
