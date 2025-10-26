from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional

# Import local modules
from models import (
    ParentAccount, ParentCreate, ParentLogin, ParentResponse, TokenResponse,
    ChildProfile, ChildProfileCreate, ChildProfileResponse, ChildLogin,
    MathActivity, ActivityRequest, ActivityResponse,
    LearningSession, SessionCreate, SessionUpdate, SessionResponse,
    SkillProgress, ProgressResponse, Achievement, DashboardData
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from ai_service import AIPersonalizationService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
parents_collection = db.parents
children_collection = db.children
sessions_collection = db.sessions
progress_collection = db.progress
achievements_collection = db.achievements

# Initialize AI service
ai_service = AIPersonalizationService()

# Create the main app
app = FastAPI()

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Parent Authentication Endpoints ============

@api_router.post("/auth/parent/register", response_model=TokenResponse)
async def register_parent(parent_data: ParentCreate):
    """Register a new parent account."""
    
    # Check if email already exists
    existing = await parents_collection.find_one({"email": parent_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create parent account
    parent = ParentAccount(
        email=parent_data.email,
        password_hash=hash_password(parent_data.password),
        name=parent_data.name
    )
    
    await parents_collection.insert_one(parent.dict())
    
    # Create access token
    access_token = create_access_token(
        data={"sub": parent.id, "user_type": "parent"}
    )
    
    return TokenResponse(
        access_token=access_token,
        user=ParentResponse(
            id=parent.id,
            email=parent.email,
            name=parent.name,
            created_at=parent.created_at
        )
    )

@api_router.post("/auth/parent/login", response_model=TokenResponse)
async def login_parent(credentials: ParentLogin):
    """Login parent account."""
    
    # Find parent by email
    parent_doc = await parents_collection.find_one({"email": credentials.email})
    if not parent_doc or not verify_password(credentials.password, parent_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": parent_doc["id"], "user_type": "parent"}
    )
    
    return TokenResponse(
        access_token=access_token,
        user=ParentResponse(
            id=parent_doc["id"],
            email=parent_doc["email"],
            name=parent_doc["name"],
            created_at=parent_doc["created_at"]
        )
    )

# ============ Child Profile Endpoints ============

@api_router.post("/child/profile", response_model=ChildProfileResponse)
async def create_child_profile(
    profile_data: ChildProfileCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a child profile."""
    
    if current_user["user_type"] != "parent":
        raise HTTPException(status_code=403, detail="Only parents can create child profiles")
    
    # Create child profile
    child = ChildProfile(
        parent_id=current_user["user_id"],
        name=profile_data.name,
        age=profile_data.age,
        avatar_id=profile_data.avatar_id,
        picture_password_id=profile_data.picture_password_id
    )
    
    await children_collection.insert_one(child.dict())
    
    # Initialize progress tracking for basic skills
    basic_skills = ["counting", "number_recognition", "shapes", "patterns"]
    for skill in basic_skills:
        skill_progress = SkillProgress(
            child_id=child.id,
            skill_type=skill
        )
        await progress_collection.insert_one(skill_progress.dict())
    
    return ChildProfileResponse(
        id=child.id,
        parent_id=child.parent_id,
        name=child.name,
        age=child.age,
        avatar_id=child.avatar_id,
        picture_password_id=child.picture_password_id,
        preferences=child.preferences,
        created_at=child.created_at,
        current_level=1,
        total_score=0
    )

@api_router.get("/child/profile/{child_id}", response_model=ChildProfileResponse)
async def get_child_profile(child_id: str, current_user: dict = Depends(get_current_user)):
    """Get child profile by ID."""
    
    child_doc = await children_collection.find_one({"id": child_id})
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child profile not found")
    
    # Calculate current level and total score from sessions
    sessions = await sessions_collection.find({"child_id": child_id}).to_list(1000)
    total_score = sum(s.get("score", 0) for s in sessions)
    current_level = min((total_score // 100) + 1, 10)  # Level up every 100 points
    
    return ChildProfileResponse(
        id=child_doc["id"],
        parent_id=child_doc["parent_id"],
        name=child_doc["name"],
        age=child_doc["age"],
        avatar_id=child_doc["avatar_id"],
        picture_password_id=child_doc["picture_password_id"],
        preferences=child_doc.get("preferences", {}),
        created_at=child_doc["created_at"],
        current_level=current_level,
        total_score=total_score
    )

@api_router.get("/child/profiles", response_model=List[ChildProfileResponse])
async def get_children_profiles(current_user: dict = Depends(get_current_user)):
    """Get all children for current parent."""
    
    if current_user["user_type"] != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    children_docs = await children_collection.find({"parent_id": current_user["user_id"]}).to_list(100)
    
    profiles = []
    for child_doc in children_docs:
        sessions = await sessions_collection.find({"child_id": child_doc["id"]}).to_list(1000)
        total_score = sum(s.get("score", 0) for s in sessions)
        current_level = min((total_score // 100) + 1, 10)
        
        profiles.append(ChildProfileResponse(
            id=child_doc["id"],
            parent_id=child_doc["parent_id"],
            name=child_doc["name"],
            age=child_doc["age"],
            avatar_id=child_doc["avatar_id"],
            picture_password_id=child_doc["picture_password_id"],
            preferences=child_doc.get("preferences", {}),
            created_at=child_doc["created_at"],
            current_level=current_level,
            total_score=total_score
        ))
    
    return profiles

@api_router.post("/auth/child/login")
async def child_login(credentials: ChildLogin):
    """Simple picture-based login for children."""
    
    child_doc = await children_collection.find_one({
        "id": credentials.child_id,
        "picture_password_id": credentials.picture_password_id
    })
    
    if not child_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect picture password"
        )
    
    # Create access token for child
    access_token = create_access_token(
        data={"sub": child_doc["id"], "user_type": "child"}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "child": {
            "id": child_doc["id"],
            "name": child_doc["name"],
            "avatar_id": child_doc["avatar_id"]
        }
    }

# ============ Learning Activities Endpoints ============

@api_router.post("/activities/math", response_model=ActivityResponse)
async def get_math_activities(request: ActivityRequest):
    """Get personalized math activities using AI."""
    
    # Get child's recent performance
    recent_sessions = await sessions_collection.find(
        {"child_id": request.child_id}
    ).sort("started_at", -1).limit(10).to_list(10)
    
    # Calculate performance metrics
    performance_data = None
    current_difficulty = 1
    
    if recent_sessions:
        total_correct = sum(s.get("correct_answers", 0) for s in recent_sessions)
        total_questions = sum(s.get("total_questions", 1) for s in recent_sessions)
        success_rate = (total_correct / total_questions * 100) if total_questions > 0 else 50
        
        performance_data = {"success_rate": success_rate}
        current_difficulty = await ai_service.adjust_difficulty(request.child_id, recent_sessions)
    
    # Get child info for age group
    child_doc = await children_collection.find_one({"id": request.child_id})
    age_group = "preschool_4-5" if child_doc and child_doc["age"] < 6 else "elementary_6-8"
    
    # Generate activities using AI
    activities = await ai_service.generate_math_activities(
        activity_type=request.activity_type,
        difficulty_level=current_difficulty,
        age_group=age_group,
        count=request.count,
        child_performance=performance_data
    )
    
    # Save activities to database
    activity_objects = []
    for activity_data in activities:
        activity = MathActivity(**activity_data)
        await db.math_activities.insert_one(activity.dict())
        activity_objects.append(activity)
    
    encouragement = await ai_service.generate_encouragement(
        score=len(recent_sessions),
        total=len(recent_sessions) + 1,
        difficulty=current_difficulty
    )
    
    return ActivityResponse(
        activities=activity_objects,
        difficulty_level=current_difficulty,
        encouragement_message=encouragement
    )

# ============ Progress Tracking Endpoints ============

@api_router.post("/progress/session", response_model=SessionResponse)
async def create_learning_session(session_data: SessionCreate):
    """Start a new learning session."""
    
    session = LearningSession(
        child_id=session_data.child_id,
        activity_id="",
        activity_type=session_data.activity_type,
        difficulty_level=session_data.difficulty_level
    )
    
    await sessions_collection.insert_one(session.dict())
    
    return SessionResponse(
        session_id=session.id,
        score=0,
        encouragement="Let's start learning! You've got this! 🌟",
        next_difficulty=session_data.difficulty_level,
        achievements=[]
    )

@api_router.put("/progress/session", response_model=SessionResponse)
async def update_learning_session(session_update: SessionUpdate):
    """Update and complete a learning session."""
    
    session_doc = await sessions_collection.find_one({"id": session_update.session_id})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate duration
    started_at = session_doc["started_at"]
    completed_at = datetime.utcnow()
    duration_seconds = int((completed_at - started_at).total_seconds())
    
    # Update session
    await sessions_collection.update_one(
        {"id": session_update.session_id},
        {"$set": {
            "completed_at": completed_at,
            "duration_seconds": duration_seconds,
            "score": session_update.score,
            "correct_answers": session_update.correct_answers,
            "total_questions": session_update.total_questions,
            "is_completed": session_update.completed
        }}
    )
    
    # Update skill progress
    child_id = session_doc["child_id"]
    activity_type = session_doc["activity_type"]
    
    skill_doc = await progress_collection.find_one({
        "child_id": child_id,
        "skill_type": activity_type
    })
    
    if skill_doc:
        new_attempts = skill_doc["total_attempts"] + session_update.total_questions
        new_successful = skill_doc["successful_attempts"] + session_update.correct_answers
        new_mastery = (new_successful / new_attempts * 100) if new_attempts > 0 else 0
        
        await progress_collection.update_one(
            {"id": skill_doc["id"]},
            {"$set": {
                "total_attempts": new_attempts,
                "successful_attempts": new_successful,
                "mastery_percentage": new_mastery,
                "last_practiced": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
    
    # Generate encouragement
    encouragement = await ai_service.generate_encouragement(
        session_update.correct_answers,
        session_update.total_questions,
        session_doc["difficulty_level"]
    )
    
    # Check for achievements
    achievements = []
    sessions_count = await sessions_collection.count_documents({"child_id": child_id})
    
    if sessions_count == 1:
        achievement = Achievement(
            child_id=child_id,
            achievement_type="first_activity",
            title="First Steps!",
            description="Completed your first learning activity!",
            icon="🌟"
        )
        await achievements_collection.insert_one(achievement.dict())
        achievements.append("First Steps!")
    
    if session_update.correct_answers == session_update.total_questions and session_update.total_questions >= 5:
        achievement = Achievement(
            child_id=child_id,
            achievement_type="perfect_score",
            title="Perfect Hero!",
            description="Got all questions correct!",
            icon="🏆"
        )
        await achievements_collection.insert_one(achievement.dict())
        achievements.append("Perfect Hero!")
    
    # Determine next difficulty
    recent_sessions = await sessions_collection.find(
        {"child_id": child_id}
    ).sort("started_at", -1).limit(5).to_list(5)
    
    next_difficulty = await ai_service.adjust_difficulty(child_id, recent_sessions)
    
    return SessionResponse(
        session_id=session_update.session_id,
        score=session_update.score,
        encouragement=encouragement,
        next_difficulty=next_difficulty,
        achievements=achievements
    )

@api_router.get("/progress/{child_id}", response_model=ProgressResponse)
async def get_child_progress(child_id: str):
    """Get comprehensive progress for a child."""
    
    # Get skill progress
    skills = await progress_collection.find({"child_id": child_id}).to_list(100)
    skill_objects = [SkillProgress(**skill) for skill in skills]
    
    # Calculate overall stats
    sessions = await sessions_collection.find({"child_id": child_id}).to_list(1000)
    total_score = sum(s.get("score", 0) for s in sessions)
    overall_level = min((total_score // 100) + 1, 10)
    
    # Calculate learning streak
    if sessions:
        unique_dates = set(s["started_at"].date() for s in sessions if s.get("started_at"))
        streak_days = len(unique_dates)
    else:
        streak_days = 0
    
    # Count achievements
    achievements_count = await achievements_collection.count_documents({"child_id": child_id})
    
    return ProgressResponse(
        child_id=child_id,
        skills=skill_objects,
        overall_level=overall_level,
        total_score=total_score,
        achievements_count=achievements_count,
        learning_streak_days=streak_days
    )

# ============ Parent Dashboard Endpoint ============

@api_router.get("/dashboard/parent/{child_id}", response_model=DashboardData)
async def get_parent_dashboard(child_id: str, current_user: dict = Depends(get_current_user)):
    """Get comprehensive dashboard data for parents."""
    
    # Get child profile
    child_doc = await children_collection.find_one({"id": child_id})
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get profile with stats
    sessions = await sessions_collection.find({"child_id": child_id}).to_list(1000)
    total_score = sum(s.get("score", 0) for s in sessions)
    current_level = min((total_score // 100) + 1, 10)
    
    child_profile = ChildProfileResponse(
        id=child_doc["id"],
        parent_id=child_doc["parent_id"],
        name=child_doc["name"],
        age=child_doc["age"],
        avatar_id=child_doc["avatar_id"],
        picture_password_id=child_doc["picture_password_id"],
        preferences=child_doc.get("preferences", {}),
        created_at=child_doc["created_at"],
        current_level=current_level,
        total_score=total_score
    )
    
    # Get recent sessions
    recent_sessions = await sessions_collection.find(
        {"child_id": child_id}
    ).sort("started_at", -1).limit(10).to_list(10)
    
    recent_session_objects = [LearningSession(**s) for s in recent_sessions]
    
    # Get skill progress
    skills = await progress_collection.find({"child_id": child_id}).to_list(100)
    skill_objects = [SkillProgress(**skill) for skill in skills]
    
    # Get achievements
    achievements_docs = await achievements_collection.find(
        {"child_id": child_id}
    ).sort("earned_at", -1).to_list(100)
    achievement_objects = [Achievement(**a) for a in achievements_docs]
    
    # Calculate weekly stats
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_sessions = [s for s in sessions if s.get("started_at") and s["started_at"] >= week_ago]
    
    total_weekly_duration = sum(s.get("duration_seconds", 0) for s in weekly_sessions)
    total_weekly_correct = sum(s.get("correct_answers", 0) for s in weekly_sessions)
    total_weekly_questions = sum(s.get("total_questions", 0) for s in weekly_sessions)

    def calculate_learning_streak(all_sessions: list) -> int:
        session_dates = sorted({s.get("started_at").date() for s in all_sessions if s.get("started_at")}, reverse=True)
        if not session_dates:
            return 0

        today = datetime.utcnow().date()
        streak = 0
        expected_day = today

        for session_day in session_dates:
            if session_day > expected_day:
                continue

            if session_day == expected_day:
                streak += 1
                expected_day = expected_day - timedelta(days=1)
                continue

            if session_day == expected_day - timedelta(days=1):
                streak += 1
                expected_day = session_day - timedelta(days=1)
                continue

            break

        return streak

    previous_week_start = week_ago - timedelta(days=7)
    previous_week_sessions = [
        s for s in sessions
        if s.get("started_at") and previous_week_start <= s["started_at"] < week_ago
    ]

    weekly_average_score = (
        sum(s.get("score", 0) for s in weekly_sessions) / len(weekly_sessions)
        if weekly_sessions else 0
    )
    previous_average_score = (
        sum(s.get("score", 0) for s in previous_week_sessions) / len(previous_week_sessions)
        if previous_week_sessions else 0
    )

    goal_minutes_target = 120
    total_time_minutes = total_weekly_duration // 60

    weekly_stats = {
        "sessions_count": len(weekly_sessions),
        "total_time_minutes": total_time_minutes,
        "average_score": int(weekly_average_score),
        "skills_practiced": len(set(s.get("activity_type") for s in weekly_sessions)),
        "accuracy_rate": round((total_weekly_correct / total_weekly_questions) * 100) if total_weekly_questions else 0,
        "average_duration_minutes": round((total_weekly_duration / len(weekly_sessions)) / 60, 1) if weekly_sessions else 0,
        "goal_completion_percentage": min(100, round((total_time_minutes / goal_minutes_target) * 100)) if goal_minutes_target else 0,
        "minutes_goal": goal_minutes_target,
        "streak_days": calculate_learning_streak(sessions),
        "active_days": len({s.get("started_at").date() for s in weekly_sessions if s.get("started_at")}),
        "score_trend": round(weekly_average_score - previous_average_score, 1)
    }

    # Generate AI-powered recommendations
    recommendations = [
        f"🎯 {child_doc['name']} is doing great with {skill_objects[0].skill_type if skill_objects else 'learning'}!",
        f"⭐ Try practicing during morning hours for better focus",
        f"📚 Explore new activity types to keep learning fun"
    ]

    engagement_insights: List[str] = []

    if weekly_stats["streak_days"] >= 5:
        engagement_insights.append("🔥 Incredible streak! Keep the daily adventures going.")
    elif weekly_stats["streak_days"] == 0:
        engagement_insights.append("Let's kickstart a new learning streak this week!")

    if weekly_stats["goal_completion_percentage"] >= 100:
        engagement_insights.append("✅ Weekly learning minutes goal met—time for a celebration!")
    elif weekly_stats["goal_completion_percentage"] < 50:
        engagement_insights.append("⏱️ A few more short sessions will help reach the weekly minutes goal.")

    if weekly_stats["accuracy_rate"] >= 85:
        engagement_insights.append("🎯 Accuracy is soaring—concepts are sticking nicely.")
    elif weekly_stats["accuracy_rate"] < 60 and weekly_stats["sessions_count"]:
        engagement_insights.append("🧠 Consider a review session to reinforce tricky topics.")

    if weekly_stats["score_trend"] > 0:
        engagement_insights.append("📈 Scores are rising compared to last week—great progress!")
    elif weekly_stats["score_trend"] < 0:
        engagement_insights.append("🔁 Slight dip in scores—try revisiting recently learned skills.")

    if weekly_stats["skills_practiced"] >= 3:
        engagement_insights.append("🌈 A wide mix of skills practiced—wonderful variety!")

    focus_areas = []
    if skill_objects:
        low_mastery_skills = sorted(skill_objects, key=lambda s: s.mastery_percentage)[:2]
        for skill in low_mastery_skills:
            focus_areas.append({
                "skill": skill.skill_type,
                "mastery_percentage": skill.mastery_percentage,
                "last_practiced": skill.last_practiced,
                "practice_prompt": f"Spend a quick session on {skill.skill_type.replace('_', ' ')} to build confidence."
            })

    return DashboardData(
        child_profile=child_profile,
        recent_sessions=recent_session_objects,
        skill_progress=skill_objects,
        achievements=achievement_objects,
        weekly_stats=weekly_stats,
        recommendations=recommendations,
        engagement_insights=engagement_insights,
        focus_areas=focus_areas
    )

# ============ Health Check ============

@api_router.get("/")
async def root():
    return {"message": "Adventure Academy Heroes API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Adventure Academy Heroes"}

# Include router in main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()