#!/usr/bin/env python3
"""Seed database with initial quests, worlds, and cosmetics"""

from app.database import (
    quests_collection, quest_steps_collection, 
    cosmetics_collection, users_collection
)
from app.utils.auth import get_password_hash
from datetime import datetime
import uuid

def clear_collections():
    """Clear existing data (use with caution!)"""
    print("Clearing existing data...")
    quests_collection.delete_many({})
    quest_steps_collection.delete_many({})
    cosmetics_collection.delete_many({})

def seed_admin_user():
    """Create default admin user"""
    print("Creating admin user...")
    
    # Check if admin exists
    existing = users_collection.find_one({"email": "admin@kidquest.com"})
    if existing:
        print("Admin user already exists")
        return existing["id"]
    
    admin_id = str(uuid.uuid4())
    admin = {
        "id": admin_id,
        "email": "admin@kidquest.com",
        "hashed_password": get_password_hash("admin123"),
        "role": "admin",
        "created_at": datetime.utcnow(),
        "consent_timestamp": datetime.utcnow()
    }
    users_collection.insert_one(admin)
    print(f"Admin user created: admin@kidquest.com / admin123")
    return admin_id

def seed_math_quests(admin_id: str):
    """Seed Math Jungle quests"""
    print("Seeding Math Jungle quests...")
    
    # Quest 1: Number Adventure
    quest1_id = str(uuid.uuid4())
    quest1 = {
        "id": quest1_id,
        "title": "Number Adventure in the Jungle",
        "description": "Help the jungle animals count their treasures! Learn counting and basic addition.",
        "world": "math_jungle",
        "subject": "math",
        "difficulty": "easy",
        "age_range": ["7-8", "9-10"],
        "estimated_minutes": 10,
        "xp_reward": 100,
        "coin_reward": 50,
        "badge_id": "badge_math_counting",
        "prerequisites": [],
        "created_at": datetime.utcnow(),
        "created_by": admin_id,
        "is_active": True
    }
    quests_collection.insert_one(quest1)
    
    # Quest 1 Steps
    steps1 = [
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest1_id,
            "step_order": 1,
            "step_type": "dialogue",
            "title": "Meet Miko the Monkey",
            "description": "Miko needs help counting bananas!",
            "config": {
                "character": "miko_monkey",
                "dialogue": "Hi there! I'm Miko! I found so many bananas but I can't count them all. Can you help me?",
                "choices": ["Sure, I'll help!", "Let's do this!"]
            },
            "hints": [],
            "xp_reward": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest1_id,
            "step_order": 2,
            "step_type": "math_puzzle",
            "title": "Count the Bananas",
            "description": "Count how many bananas Miko has collected",
            "config": {
                "puzzle_type": "counting",
                "question": "How many bananas do you see?",
                "correct_answer": 8,
                "visual_items": ["banana"] * 8,
                "min_value": 1,
                "max_value": 10
            },
            "hints": [
                "Try counting each banana one by one",
                "Start from the left and count to the right",
                "The answer is 8"
            ],
            "xp_reward": 25
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest1_id,
            "step_order": 3,
            "step_type": "math_puzzle",
            "title": "Addition Fun",
            "description": "Miko found more bananas! How many does he have now?",
            "config": {
                "puzzle_type": "addition",
                "question": "Miko had 8 bananas. He found 3 more. How many does he have now?",
                "operand1": 8,
                "operand2": 3,
                "correct_answer": 11,
                "visual_mode": True
            },
            "hints": [
                "Try adding the numbers together",
                "8 + 3 = ?",
                "The answer is 11"
            ],
            "xp_reward": 30
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest1_id,
            "step_order": 4,
            "step_type": "collect",
            "title": "Collect Your Reward",
            "description": "Great job! Collect your treasure!",
            "config": {
                "item": "golden_banana",
                "quantity": 1,
                "message": "You earned a Golden Banana trophy!"
            },
            "hints": [],
            "xp_reward": 35
        }
    ]
    quest_steps_collection.insert_many(steps1)
    
    # Quest 2: Fraction Forest
    quest2_id = str(uuid.uuid4())
    quest2 = {
        "id": quest2_id,
        "title": "Fraction Forest Adventure",
        "description": "Learn about fractions by helping animals share their food fairly!",
        "world": "math_jungle",
        "subject": "math",
        "difficulty": "medium",
        "age_range": ["9-10", "11-12"],
        "estimated_minutes": 15,
        "xp_reward": 150,
        "coin_reward": 75,
        "badge_id": "badge_math_fractions",
        "prerequisites": [quest1_id],
        "created_at": datetime.utcnow(),
        "created_by": admin_id,
        "is_active": True
    }
    quests_collection.insert_one(quest2)
    
    steps2 = [
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest2_id,
            "step_order": 1,
            "step_type": "dialogue",
            "title": "Meet Ella the Elephant",
            "description": "Ella needs help dividing pizza!",
            "config": {
                "character": "ella_elephant",
                "dialogue": "Hello friend! I have pizzas to share with my friends, but I need help dividing them fairly. Can you help?",
                "choices": ["Of course!", "Let's learn fractions!"]
            },
            "hints": [],
            "xp_reward": 15
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest2_id,
            "step_order": 2,
            "step_type": "math_puzzle",
            "title": "Half of a Pizza",
            "description": "Divide the pizza in half",
            "config": {
                "puzzle_type": "fractions",
                "question": "If Ella divides 1 pizza equally between 2 friends, what fraction does each get?",
                "numerator": 1,
                "denominator": 2,
                "visual_type": "pizza",
                "correct_answer": "1/2"
            },
            "hints": [
                "When you divide something into 2 equal parts, each part is 1/2",
                "Half is the same as 1 divided by 2",
                "The answer is 1/2"
            ],
            "xp_reward": 50
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest2_id,
            "step_order": 3,
            "step_type": "math_puzzle",
            "title": "Quarters Challenge",
            "description": "Now divide the pizza into quarters",
            "config": {
                "puzzle_type": "fractions",
                "question": "If 1 pizza is divided equally among 4 friends, what fraction does each get?",
                "numerator": 1,
                "denominator": 4,
                "visual_type": "pizza",
                "correct_answer": "1/4"
            },
            "hints": [
                "Divide the pizza into 4 equal slices",
                "Each friend gets 1 out of 4 slices",
                "The answer is 1/4"
            ],
            "xp_reward": 50
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest2_id,
            "step_order": 4,
            "step_type": "collect",
            "title": "Fraction Master Badge",
            "description": "You've mastered fractions!",
            "config": {
                "item": "fraction_trophy",
                "quantity": 1,
                "message": "You're now a Fraction Master!"
            },
            "hints": [],
            "xp_reward": 35
        }
    ]
    quest_steps_collection.insert_many(steps2)
    
    print(f"Created {2} Math quests")

def seed_coding_quests(admin_id: str):
    """Seed Code City quests"""
    print("Seeding Code City quests...")
    
    quest_id = str(uuid.uuid4())
    quest = {
        "id": quest_id,
        "title": "Robot Rescue Mission",
        "description": "Program a robot to navigate through Code City and rescue the lost kitten!",
        "world": "code_city",
        "subject": "coding",
        "difficulty": "easy",
        "age_range": ["7-8", "9-10", "11-12"],
        "estimated_minutes": 12,
        "xp_reward": 120,
        "coin_reward": 60,
        "badge_id": "badge_coding_basics",
        "prerequisites": [],
        "created_at": datetime.utcnow(),
        "created_by": admin_id,
        "is_active": True
    }
    quests_collection.insert_one(quest)
    
    steps = [
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 1,
            "step_type": "dialogue",
            "title": "Meet Robo",
            "description": "Your robot friend needs programming!",
            "config": {
                "character": "robo_robot",
                "dialogue": "Beep boop! I'm Robo! A kitten is stuck on the other side of the street. Help me program my moves to rescue it!",
                "choices": ["Let's code!", "I'll help!"]
            },
            "hints": [],
            "xp_reward": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 2,
            "step_type": "code_puzzle",
            "title": "Move Forward",
            "description": "Drag blocks to make Robo move forward 3 steps",
            "config": {
                "puzzle_type": "sequence",
                "grid_size": {"width": 5, "height": 3},
                "start_position": {"x": 0, "y": 1},
                "goal_position": {"x": 3, "y": 1},
                "obstacles": [],
                "available_blocks": ["move_forward", "turn_left", "turn_right"],
                "solution": ["move_forward", "move_forward", "move_forward"]
            },
            "hints": [
                "Use the 'move forward' block",
                "You need 3 'move forward' blocks",
                "Drag 3 move forward blocks in sequence"
            ],
            "xp_reward": 40
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 3,
            "step_type": "code_puzzle",
            "title": "Turn and Move",
            "description": "Make Robo turn and navigate around the corner",
            "config": {
                "puzzle_type": "sequence",
                "grid_size": {"width": 5, "height": 5},
                "start_position": {"x": 0, "y": 2},
                "goal_position": {"x": 2, "y": 0},
                "obstacles": [{"x": 1, "y": 1}],
                "available_blocks": ["move_forward", "turn_left", "turn_right"],
                "solution": ["move_forward", "move_forward", "turn_right", "move_forward", "move_forward"]
            },
            "hints": [
                "Move forward twice, then turn",
                "After turning, move forward twice more",
                "Solution: Forward, Forward, Turn Right, Forward, Forward"
            ],
            "xp_reward": 50
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 4,
            "step_type": "collect",
            "title": "Mission Complete!",
            "description": "You saved the kitten!",
            "config": {
                "item": "coding_badge",
                "quantity": 1,
                "message": "You're a coding hero! The kitten is safe!"
            },
            "hints": [],
            "xp_reward": 20
        }
    ]
    quest_steps_collection.insert_many(steps)
    
    print(f"Created 1 Coding quest")

def seed_science_quests(admin_id: str):
    """Seed Science Spaceport quests"""
    print("Seeding Science Spaceport quests...")
    
    quest_id = str(uuid.uuid4())
    quest = {
        "id": quest_id,
        "title": "Gravity Experiment",
        "description": "Learn about gravity by experimenting with objects in space!",
        "world": "science_spaceport",
        "subject": "science",
        "difficulty": "easy",
        "age_range": ["7-8", "9-10", "11-12"],
        "estimated_minutes": 10,
        "xp_reward": 100,
        "coin_reward": 50,
        "badge_id": "badge_science_gravity",
        "prerequisites": [],
        "created_at": datetime.utcnow(),
        "created_by": admin_id,
        "is_active": True
    }
    quests_collection.insert_one(quest)
    
    steps = [
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 1,
            "step_type": "dialogue",
            "title": "Meet Captain Cosmo",
            "description": "The space captain needs your help!",
            "config": {
                "character": "captain_cosmo",
                "dialogue": "Greetings, space cadet! We're studying gravity today. Let's run some experiments!",
                "choices": ["Ready for science!", "Let's explore!"]
            },
            "hints": [],
            "xp_reward": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 2,
            "step_type": "science_sim",
            "title": "Dropping Objects",
            "description": "What happens when we drop different objects?",
            "config": {
                "sim_type": "gravity_drop",
                "question": "Drop a feather and a rock. Which hits the ground first on Earth?",
                "objects": ["feather", "rock"],
                "environment": "earth",
                "correct_answer": "rock",
                "explanation": "On Earth, the rock falls faster because air resistance slows the feather down. In space (no air), they'd fall at the same speed!"
            },
            "hints": [
                "Think about which object is heavier",
                "Air slows down light objects",
                "The rock falls faster on Earth"
            ],
            "xp_reward": 40
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 3,
            "step_type": "science_sim",
            "title": "Space vs Earth",
            "description": "Now try the same experiment in space!",
            "config": {
                "sim_type": "gravity_drop",
                "question": "In space (no air), would the feather and rock fall at the same speed?",
                "objects": ["feather", "rock"],
                "environment": "space",
                "correct_answer": "yes",
                "explanation": "Without air resistance, all objects fall at the same speed due to gravity!"
            },
            "hints": [
                "There's no air in space",
                "Without air resistance, what happens?",
                "They fall at the same speed!"
            ],
            "xp_reward": 40
        },
        {
            "id": str(uuid.uuid4()),
            "quest_id": quest_id,
            "step_order": 4,
            "step_type": "collect",
            "title": "Science Star",
            "description": "You're a gravity expert!",
            "config": {
                "item": "gravity_badge",
                "quantity": 1,
                "message": "Amazing! You understand gravity!"
            },
            "hints": [],
            "xp_reward": 10
        }
    ]
    quest_steps_collection.insert_many(steps)
    
    print(f"Created 1 Science quest")

def seed_cosmetics():
    """Seed initial cosmetics"""
    print("Seeding cosmetics...")
    
    cosmetics = [
        # Hair styles
        {
            "id": str(uuid.uuid4()),
            "name": "Short Hair",
            "category": "hair_style",
            "value": "short",
            "description": "Classic short hairstyle",
            "unlock_requirement": "Default",
            "coin_cost": 0,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Spiky Hair",
            "category": "hair_style",
            "value": "spiky",
            "description": "Cool spiky hairstyle",
            "unlock_requirement": "Complete 3 quests",
            "coin_cost": 100,
            "created_at": datetime.utcnow()
        },
        # Outfits
        {
            "id": str(uuid.uuid4()),
            "name": "Casual Blue",
            "category": "outfit",
            "value": "casual_blue",
            "description": "Comfortable blue outfit",
            "unlock_requirement": "Default",
            "coin_cost": 0,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Superhero Cape",
            "category": "outfit",
            "value": "superhero_cape",
            "description": "Become a learning superhero!",
            "unlock_requirement": "Reach level 5",
            "coin_cost": 200,
            "created_at": datetime.utcnow()
        },
        # Accessories
        {
            "id": str(uuid.uuid4()),
            "name": "Cool Glasses",
            "category": "accessory",
            "value": "glasses",
            "description": "Smart-looking glasses",
            "unlock_requirement": "Complete Math Jungle",
            "coin_cost": 150,
            "created_at": datetime.utcnow()
        }
    ]
    
    cosmetics_collection.insert_many(cosmetics)
    print(f"Created {len(cosmetics)} cosmetics")

def main():
    print("\n" + "="*50)
    print("KidQuest Academy - Database Seeding")
    print("="*50 + "\n")
    
    # Create admin user
    admin_id = seed_admin_user()
    
    # Seed quests
    seed_math_quests(admin_id)
    seed_coding_quests(admin_id)
    seed_science_quests(admin_id)
    
    # Seed cosmetics
    seed_cosmetics()
    
    print("\n" + "="*50)
    print("Seeding complete!")
    print("="*50)
    print("\nDefault Admin Credentials:")
    print("Email: admin@kidquest.com")
    print("Password: admin123")
    print("\n")

if __name__ == "__main__":
    main()