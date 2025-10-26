from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

# ============ User & Authentication Models ============

class ParentAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class ParentCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class ParentLogin(BaseModel):
    email: EmailStr
    password: str

class ParentResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ParentResponse

# ============ Child Profile Models ============

class ChildProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parent_id: str
    name: str
    age: int
    avatar_id: str  # Reference to selected avatar
    picture_password_id: str  # Reference to picture password
    preferences: Dict = Field(default_factory=dict)  # Learning preferences, favorite themes
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class ChildProfileCreate(BaseModel):
    name: str
    age: int
    avatar_id: str
    picture_password_id: str

class ChildProfileResponse(BaseModel):
    id: str
    parent_id: str
    name: str
    age: int
    avatar_id: str
    picture_password_id: str
    preferences: Dict
    created_at: datetime
    current_level: int = 1
    total_score: int = 0

class ChildLogin(BaseModel):
    child_id: str
    picture_password_id: str

# ============ Learning Content Models ============

class MathActivity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    activity_type: str  # "counting", "number_recognition", "shapes", "addition", "subtraction"
    question_text: str
    question_data: Dict  # Specific data for the activity (numbers, images, etc)
    correct_answer: str
    difficulty_level: int  # 1-5
    age_group: str  # "preschool_4-5", "elementary_6-8", "elementary_8-10"
    hints: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityRequest(BaseModel):
    child_id: str
    activity_type: Optional[str] = "counting"
    count: int = 5

class ActivityResponse(BaseModel):
    activities: List[MathActivity]
    difficulty_level: int
    encouragement_message: str

# ============ Learning Session Models ============

class LearningSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    child_id: str
    activity_id: str
    activity_type: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    score: int = 0
    correct_answers: int = 0
    total_questions: int = 0
    difficulty_level: int = 1
    is_completed: bool = False

class SessionCreate(BaseModel):
    child_id: str
    activity_type: str
    difficulty_level: int = 1

class SessionUpdate(BaseModel):
    session_id: str
    score: int
    correct_answers: int
    total_questions: int
    completed: bool = True

class SessionResponse(BaseModel):
    session_id: str
    score: int
    encouragement: str
    next_difficulty: int
    achievements: List[str] = []

# ============ Progress Tracking Models ============

class SkillProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    child_id: str
    skill_type: str  # "counting", "number_recognition", "shapes", etc
    current_level: int = 1
    mastery_percentage: float = 0.0
    total_attempts: int = 0
    successful_attempts: int = 0
    last_practiced: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProgressResponse(BaseModel):
    child_id: str
    skills: List[SkillProgress]
    overall_level: int
    total_score: int
    achievements_count: int
    learning_streak_days: int

# ============ Achievement Models ============

class Achievement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    child_id: str
    achievement_type: str  # "first_activity", "10_in_a_row", "speed_demon", etc
    title: str
    description: str
    icon: str
    earned_at: datetime = Field(default_factory=datetime.utcnow)

# ============ Parent Dashboard Models ============

class DashboardData(BaseModel):
    child_profile: ChildProfileResponse
    recent_sessions: List[LearningSession]
    skill_progress: List[SkillProgress]
    achievements: List[Achievement]
    weekly_stats: Dict[str, Any]
    recommendations: List[str]
    engagement_insights: List[str] = []
    focus_areas: List[Dict[str, Any]] = []
