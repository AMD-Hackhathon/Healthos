import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.cache import invalidate_user_cache
from app.database import get_db
from app.models import HealthProfile, User
from app.schemas import (
    EmergencyContact,
    HealthProfileResponse,
    HealthProfileUpdate,
    Medication,
)

router = APIRouter(prefix="/users", tags=["users"])

medications_adapter = TypeAdapter(list[Medication])


def _loads_json_field(value: str | None, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


@router.get("/me", response_model=HealthProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    profile = db.query(HealthProfile).filter_by(user_id=current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    is_complete = all(
        [
            profile.age is not None,
            profile.sex is not None,
            profile.height_cm is not None,
            profile.weight_kg is not None,
        ]
    )

    return HealthProfileResponse(
        age=profile.age,
        sex=profile.sex,
        height_cm=profile.height_cm,
        weight_kg=profile.weight_kg,
        conditions=_loads_json_field(profile.conditions, None),
        medications=medications_adapter.validate_python(
            _loads_json_field(profile.medications, [])
        )
        if profile.medications
        else None,
        emergency_contact=EmergencyContact(
            name=profile.emergency_contact_name,
            phone=profile.emergency_contact_phone,
        )
        if profile.emergency_contact_name and profile.emergency_contact_phone
        else None,
        is_complete=is_complete,
    )


@router.put("/me", response_model=HealthProfileResponse)
def update_profile(
    data: HealthProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(HealthProfile).filter_by(user_id=current_user.id).first()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)

    updates = data.model_dump(mode="json", exclude_unset=True)

    if "medications" in updates:
        updates["medications"] = json.dumps(updates["medications"])
    if "conditions" in updates:
        updates["conditions"] = json.dumps(updates["conditions"])
    if "emergency_contact" in updates:
        ec = updates.pop("emergency_contact")
        updates["emergency_contact_name"] = ec["name"]
        updates["emergency_contact_phone"] = ec["phone"]

    for field, value in updates.items():
        setattr(profile, field, value)

    db.commit()
    invalidate_user_cache(current_user.id)
    db.refresh(profile)
    return get_profile(current_user, db)
