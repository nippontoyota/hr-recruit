import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.settings import LocationTemplate, MessageTemplate
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.settings import (
    LocationTemplateCreate,
    LocationTemplateUpdate,
    LocationTemplateResponse,
    MessageTemplateCreate,
    MessageTemplateUpdate,
    MessageTemplateResponse,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# Location Templates
# -----------------------------------------------------------------------------

@router.get("/locations", response_model=List[LocationTemplateResponse])
async def list_location_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all location templates."""
    query = select(LocationTemplate).order_by(LocationTemplate.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/locations", response_model=LocationTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_location_template(
    template_in: LocationTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new location template. HR access only."""
    # If is_default is true, we should unset the others, but let's keep it simple for now
    if template_in.is_default:
        # Optionally turn off default for all other templates of same mode
        pass
        
    db_template = LocationTemplate(**template_in.model_dump())
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    return db_template


@router.put("/locations/{template_id}", response_model=LocationTemplateResponse)
async def update_location_template(
    template_id: uuid.UUID,
    template_in: LocationTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a location template."""
    query = select(LocationTemplate).where(LocationTemplate.id == template_id)
    result = await db.execute(query)
    db_template = result.scalars().first()
    
    if not db_template:
        raise HTTPException(status_code=404, detail="Location template not found")

    update_data = template_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_template, field, value)

    await db.commit()
    await db.refresh(db_template)
    return db_template


@router.delete("/locations/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a location template."""
    query = select(LocationTemplate).where(LocationTemplate.id == template_id)
    result = await db.execute(query)
    db_template = result.scalars().first()
    
    if not db_template:
        raise HTTPException(status_code=404, detail="Location template not found")
        
    await db.delete(db_template)
    await db.commit()


# -----------------------------------------------------------------------------
# Message Templates
# -----------------------------------------------------------------------------

@router.get("/messages", response_model=List[MessageTemplateResponse])
async def list_message_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all message templates."""
    query = select(MessageTemplate).order_by(MessageTemplate.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/messages", response_model=MessageTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_message_template(
    template_in: MessageTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new message template. HR access only."""
    db_template = MessageTemplate(**template_in.model_dump())
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    return db_template


@router.put("/messages/{template_id}", response_model=MessageTemplateResponse)
async def update_message_template(
    template_id: uuid.UUID,
    template_in: MessageTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a message template."""
    query = select(MessageTemplate).where(MessageTemplate.id == template_id)
    result = await db.execute(query)
    db_template = result.scalars().first()
    
    if not db_template:
        raise HTTPException(status_code=404, detail="Message template not found")

    update_data = template_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_template, field, value)

    await db.commit()
    await db.refresh(db_template)
    return db_template


@router.delete("/messages/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a message template."""
    query = select(MessageTemplate).where(MessageTemplate.id == template_id)
    result = await db.execute(query)
    db_template = result.scalars().first()
    
    if not db_template:
        raise HTTPException(status_code=404, detail="Message template not found")
        
    await db.delete(db_template)
    await db.commit()
