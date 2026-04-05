from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.models import Settings
from app.schemas import SettingsResponse, SettingsUpdate, SettingsCreate

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/{user_id}", response_model=SettingsResponse)
async def get_settings(user_id: UUID, db: Session = Depends(get_db)):
    settings_db = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Settings not found for this user."
        )
    return settings_db


@router.post("/", response_model=SettingsResponse)
async def create_settings(settings_in: SettingsCreate, db: Session = Depends(get_db)):
    existing = db.query(Settings).filter(Settings.user_id == settings_in.user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Settings already exist for this user."
        )
    
    new_settings = Settings(**settings_in.model_dump())
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    return new_settings


@router.put("/{user_id}", response_model=SettingsResponse)
async def update_settings(user_id: UUID, settings_in: SettingsUpdate, db: Session = Depends(get_db)):
    settings_db = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Settings not found for this user."
        )
    
    update_data = settings_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings_db, key, value)
        
    db.commit()
    db.refresh(settings_db)
    return settings_db
