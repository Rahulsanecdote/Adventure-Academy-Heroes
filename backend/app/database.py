from pymongo import MongoClient
from app.config import settings
import os

# Get MongoDB URL from environment
MONGO_URL = os.environ.get('MONGO_URL', settings.mongo_url)

# Client options bound every database operation and recycle pooled sockets.
# Diagnosed on Fly (Nov 13, 2026): with pymongo defaults, requests served by
# the long-running web process intermittently stalled 30-120s+ reaching
# MongoDB over Fly's private network, while a fresh client in the same
# machine connected and queried in ~0.01s (verified repeatedly, including
# after 90-120s idle). Short timeouts make a stalled connection fail fast
# and reconnect — which is the path that is always fast here — instead of
# hanging the request, and maxIdleTimeMS retires pooled sockets before
# they can go stale.
client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=8000,
    connectTimeoutMS=5000,
    socketTimeoutMS=15000,
    maxIdleTimeMS=30000,
    retryWrites=True,
)
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
# Phase 3: Trick Academy (The Ascent — dare/reveal/why/side-by-side/remix/
# boss sessions, mastery, boss attempts, dares, teach-backs, encores)
trick_sessions_collection = db.trick_sessions
trick_mastery_collection = db.trick_mastery
trick_attempts_collection = db.trick_attempts
trick_dares_collection = db.trick_dares
trick_teachbacks_collection = db.trick_teachbacks
trick_encores_collection = db.trick_encores

def get_database():
    return db