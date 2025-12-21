from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

class UserBase(BaseModel):
    email: EmailStr
    role: Literal["parent", "admin"] = "parent"

class UserCreate(UserBase):
    password: str
    consent_timestamp: Optional[datetime] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    consent_timestamp: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "parent@example.com",
                "role": "parent",
                "created_at": "2024-01-01T00:00:00"
            }
        }

class User(UserBase):
    id: str
    created_at: datetime
    consent_timestamp: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[str] = None