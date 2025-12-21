from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models.child import ChildProfileCreate, ChildProfile, AvatarCustomization
from app.database import children_collection, progress_collection, inventory_collection
from app.utils.auth import get_current_parent
from app.models.user import TokenData
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/children", tags=["children"])

@router.post("", response_model=ChildProfile, status_code=status.HTTP_201_CREATED)
async def create_child_profile(child_data: ChildProfileCreate, current_user: TokenData = Depends(get_current_parent)):
    # Verify parent_id matches current user
    if child_data.parent_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create profile for another parent"
        )
    
    # Check username uniqueness
    existing = children_collection.find_one({"username": child_data.username})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create child profile
    child_dict = child_data.model_dump()
    child_dict["id"] = str(uuid.uuid4())
    child_dict["created_at"] = datetime.utcnow()
    child_dict["total_xp"] = 0
    child_dict["level"] = 1
    child_dict["coins"] = 0
    child_dict["hint_buddy_enabled"] = False
    
    children_collection.insert_one(child_dict)
    
    return ChildProfile(**child_dict)

@router.get("", response_model=List[ChildProfile])
async def get_children(current_user: TokenData = Depends(get_current_parent)):
    children = list(children_collection.find({"parent_id": current_user.user_id}))
    return [ChildProfile(**child) for child in children]

@router.get("/{child_id}", response_model=ChildProfile)
async def get_child(child_id: str, current_user: TokenData = Depends(get_current_parent)):
    child = children_collection.find_one({"id": child_id, "parent_id": current_user.user_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found"
        )
    return ChildProfile(**child)

@router.patch("/{child_id}/avatar", response_model=ChildProfile)
async def update_avatar(child_id: str, avatar: AvatarCustomization, current_user: TokenData = Depends(get_current_parent)):
    child = children_collection.find_one({"id": child_id, "parent_id": current_user.user_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found"
        )
    
    children_collection.update_one(
        {"id": child_id},
        {"$set": {"avatar": avatar.model_dump()}}
    )
    
    updated_child = children_collection.find_one({"id": child_id})
    return ChildProfile(**updated_child)

@router.patch("/{child_id}/hint-buddy", response_model=ChildProfile)
async def toggle_hint_buddy(child_id: str, enabled: bool, current_user: TokenData = Depends(get_current_parent)):
    child = children_collection.find_one({"id": child_id, "parent_id": current_user.user_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found"
        )
    
    children_collection.update_one(
        {"id": child_id},
        {"$set": {"hint_buddy_enabled": enabled}}
    )
    
    updated_child = children_collection.find_one({"id": child_id})
    return ChildProfile(**updated_child)

@router.delete("/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_child_profile(child_id: str, current_user: TokenData = Depends(get_current_parent)):
    child = children_collection.find_one({"id": child_id, "parent_id": current_user.user_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found"
        )
    
    # Delete child data
    children_collection.delete_one({"id": child_id})
    progress_collection.delete_many({"child_id": child_id})
    inventory_collection.delete_many({"child_id": child_id})
    
    return None