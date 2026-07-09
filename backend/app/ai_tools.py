from langchain.tools import tool

from app.database import SessionLocal
from app.models import MedicalEntry


@tool
def get_user_medical_history(
    user_id: str, start_date: str | None = None, end_date: str | None = None
) -> list[dict]:
    """Fetch a user's medical history, optionally filtered by date range."""
    with SessionLocal() as db:
        query = db.query(MedicalEntry).filter_by(user_id=user_id)
        if start_date:
            query = query.filter(MedicalEntry.recorded_at >= start_date)
        if end_date:
            query = query.filter(MedicalEntry.recorded_at <= end_date)
        entries = query.all()
        return [
            {
                "term": e.term,
                "value": e.value,
                "unit": e.unit,
                "recorded_at": str(e.recorded_at),
            }
            for e in entries
        ]
