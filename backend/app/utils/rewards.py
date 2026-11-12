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


def award_standalone_rewards(child: dict, *, title: str, xp_reward: int,
                             coin_reward: int, badge_id: str = None,
                             badge_name: str = None, badge_description: str = None,
                             badge_icon: str = "🏆", category: str = "math") -> dict:
    """Award XP/coins (+ an optional named badge) outside the quest flow.

    Phase 3: Trick Academy Boss Gate victories pay out through here. Same
    storage effects as award_quest_rewards (child totals + inventory badge),
    but the badge keeps the technique's own name instead of a quest-derived
    "<title> Master".
    """
    old_level = child["level"]
    new_xp = child["total_xp"] + xp_reward
    new_level = calculate_level(new_xp)
    new_coins = child["coins"] + coin_reward

    children_collection.update_one(
        {"id": child["id"]},
        {"$set": {
            "total_xp": new_xp,
            "level": new_level,
            "coins": new_coins,
        }},
    )

    badges = []
    if badge_id:
        inventory_collection.insert_one({
            "id": str(uuid.uuid4()),
            "child_id": child["id"],
            "item_type": "badge",
            "item_id": badge_id,
            "earned_at": datetime.utcnow(),
            "is_equipped": False,
        })
        badges.append({
            "id": badge_id,
            "name": badge_name or f"{title} Master",
            "description": badge_description or f"Mastered {title}",
            "icon": badge_icon,
            "category": category,
            "rarity": "common",
            "created_at": datetime.utcnow(),
        })

    return {
        "quest_title": title,
        "xp_earned": xp_reward,
        "coins_earned": coin_reward,
        "badges": badges,
        "cosmetics": [],
        "new_level": new_level if new_level > old_level else None,
        "total_xp": new_xp,
        "total_coins": new_coins,
    }
