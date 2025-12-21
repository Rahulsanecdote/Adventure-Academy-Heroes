from fastapi import APIRouter, HTTPException, status, Depends
from app.models.user import UserCreate, UserLogin, User, Token, UserInDB
from app.models.child import ChildSession
from app.database import users_collection, children_collection
from app.utils.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.models.user import TokenData
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    # Check if user exists
    existing_user = users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["hashed_password"] = get_password_hash(user_data.password)
    user_dict["created_at"] = datetime.utcnow()
    user_dict["consent_timestamp"] = datetime.utcnow()
    del user_dict["password"]
    
    users_collection.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(
        data={"sub": user_data.email, "role": user_data.role, "user_id": user_dict["id"]}
    )
    
    user_response = User(
        id=user_dict["id"],
        email=user_dict["email"],
        role=user_dict["role"],
        created_at=user_dict["created_at"],
        consent_timestamp=user_dict.get("consent_timestamp")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"], "user_id": user["id"]}
    )
    
    user_response = User(
        id=user["id"],
        email=user["email"],
        role=user["role"],
        created_at=user["created_at"],
        consent_timestamp=user.get("consent_timestamp")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@router.post("/child-session/{child_id}", response_model=ChildSession)
async def create_child_session(child_id: str, current_user: TokenData = Depends(get_current_user)):
    # Verify child belongs to parent
    child = children_collection.find_one({"id": child_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found"
        )
    
    if child["parent_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this child profile"
        )
    
    # Create child session token
    access_token = create_access_token(
        data={
            "sub": current_user.email,
            "role": "child",
            "user_id": current_user.user_id,
            "child_id": child_id
        },
        expires_delta=timedelta(hours=4)  # Shorter session for kids
    )
    
    return ChildSession(
        child_id=child_id,
        parent_id=current_user.user_id,
        username=child["username"],
        access_token=access_token
    )

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    user = users_collection.find_one({"id": current_user.user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return User(
        id=user["id"],
        email=user["email"],
        role=user["role"],
        created_at=user["created_at"],
        consent_timestamp=user.get("consent_timestamp")
    )