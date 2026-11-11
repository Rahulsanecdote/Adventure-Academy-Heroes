from pymongo import MongoClient
from app.config import settings
import os

# Get MongoDB URL from environment
MONGO_URL = os.environ.get('MONGO_URL', settings.mongo_url)

client = MongoClient(MONGO_URL)
db = client.kidquest

# Collections
users_collection = db.users
children_collection = db.child_profiles
quests_collection = db.quests
quest_steps_collection = db.quest_steps
progress_collection = db.progress
cosmetics_collection = db.cosmetics
inventory_collection = db.inventory
rewards_collection = db.rewards
# Phase 1: server-validated math challenges
challenges_collection = db.challenge_sessions
attempts_collection = db.challenge_attempts

def get_database():
    return db