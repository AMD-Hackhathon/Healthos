import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import HealthSummary, User
from app.schemas import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    summary = db.query(HealthSummary).filter_by(user_id=current_user.id).first()

    if not summary:
        return DashboardResponse(health_score=0, insights=[])

    try:
        insights = json.loads(summary.insights)
    except json.JSONDecodeError:
        insights = []

    return DashboardResponse(
        health_score=summary.health_score,
        insights=insights,
    )
