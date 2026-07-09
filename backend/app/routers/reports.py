import json
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import MedicalEntry, Report, User
from app.schemas import MedicalEntryResponse, ReportResponse, ReportUploadResponse

router = APIRouter(prefix="/reports", tags=["reports"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def fake_generate_summary(db: Session, user_id: uuid.UUID) -> None:
    """
    STUB — placeholder until real AI scoring is wired in (LangChain/Fireworks).
    Regenerates HealthSummary for a user. Called after new data is written.
    """
    import json as json_lib

    from app.models import HealthSummary

    insights = [
        {"type": "status", "icon": "green", "text": "No critical issues detected."},
        {
            "type": "reminder",
            "icon": "pill",
            "text": "Placeholder reminder — real AI reasoning coming soon.",
        },
    ]

    summary = db.query(HealthSummary).filter_by(user_id=user_id).first()
    if not summary:
        summary = HealthSummary(
            user_id=user_id, health_score=85, insights=json_lib.dumps(insights)
        )
        db.add(summary)
    else:
        summary.health_score = 85
        summary.insights = json_lib.dumps(insights)

    db.commit()


def fake_analyze_report() -> dict:
    """
    STUB — placeholder until the real OCR/AI pipeline is wired in.
    Returns a shape matching what the real pipeline will eventually produce.
    """
    return {
        "summary": "This is a placeholder summary. Real analysis coming soon.",
        "risk_level": "advice",
        "flagged_values": [
            {
                "term": "ldl_cholesterol",
                "value": "145",
                "unit": "mg/dL",
                "status": "high",
            },
        ],
    }


@router.post("/upload", response_model=ReportUploadResponse, status_code=201)
def upload_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    report = Report(
        user_id=current_user.id,
        file_path=file_path,
        status="processing",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # --- STUB: replace this block with the real OCR/AI call later ---
    result = fake_analyze_report()

    report.status = "complete"
    report.summary = result["summary"]
    report.risk_level = result["risk_level"]

    for item in result["flagged_values"]:
        entry = MedicalEntry(
            user_id=current_user.id,
            report_id=report.id,
            term=item["term"],
            value=item["value"],
            unit=item.get("unit"),
            status=item.get("status"),
            source="report_upload",
            recorded_at=datetime.now(timezone.utc),
        )
        db.add(entry)
    # --- end stub ---

    fake_generate_summary(db, current_user.id)
    db.commit()
    db.refresh(report)

    return ReportUploadResponse(report_id=report.id, status=report.status)


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter_by(id=report_id, user_id=current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    flagged_values = db.query(MedicalEntry).filter_by(report_id=report.id).all()

    return ReportResponse(
        id=report.id,
        status=report.status,
        summary=report.summary,
        risk_level=report.risk_level,
        created_at=report.created_at,
        flagged_values=[MedicalEntryResponse.model_validate(e) for e in flagged_values],
    )
