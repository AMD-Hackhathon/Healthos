from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.ai_tools import analyze_report, generate_health_summary, utcnow
from app.auth import get_current_user
from app.cache import invalidate_user_cache, response_cache
from app.database import get_db
from app.models import MedicalEntry, Report, User
from app.schemas import (
    MedicalEntryResponse,
    ReportResponse,
    ReportSummaryResponse,
    ReportUploadResponse,
)

router = APIRouter(prefix="/reports", tags=["reports"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=ReportUploadResponse, status_code=201)
def upload_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filename = Path(file.filename or "report").name
    file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{filename}")
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

    try:
        result = analyze_report(file_path)
    except Exception as exc:
        report.status = "failed"
        report.summary = "Report analysis failed. Please try uploading the file again."
        db.commit()
        raise HTTPException(status_code=500, detail="Report analysis failed") from exc

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
            recorded_at=utcnow(),
        )
        db.add(entry)

    db.flush()
    generate_health_summary(db, current_user.id)
    db.commit()
    invalidate_user_cache(current_user.id)
    db.refresh(report)

    return ReportUploadResponse(report_id=report.id, status=report.status)


@router.get("", response_model=list[ReportSummaryResponse])
def list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reports = (
        db.query(Report)
        .filter_by(user_id=current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return [
        ReportSummaryResponse(
            id=r.id,
            status=r.status,
            risk_level=r.risk_level,
            created_at=r.created_at,
            display_name=_display_name(r.file_path),
        )
        for r in reports
    ]


def _display_name(file_path: str) -> str:
    # file_path is saved as "{uuid}_{original_filename}" — strip the uuid prefix
    name = file_path.split("/")[-1]
    parts = name.split("_", 1)
    return parts[1] if len(parts) == 2 else name


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cache_key = ("report", str(current_user.id), str(report_id))
    cached = response_cache.get(cache_key)
    if isinstance(cached, ReportResponse):
        return cached

    report = db.query(Report).filter_by(id=report_id, user_id=current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    flagged_values = (
        db.query(MedicalEntry)
        .filter_by(report_id=report.id)
        .order_by(MedicalEntry.recorded_at.asc(), MedicalEntry.term.asc())
        .all()
    )

    response = ReportResponse(
        id=report.id,
        status=report.status,
        summary=report.summary,
        risk_level=report.risk_level,
        created_at=report.created_at,
        flagged_values=[MedicalEntryResponse.model_validate(e) for e in flagged_values],
    )
    response_cache.set(cache_key, response)
    return response


@router.get("/{report_id}/file")
def get_report_file(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter_by(id=report_id, user_id=current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Original file not found")

    return FileResponse(
        report.file_path,
        filename=_display_name(report.file_path),
    )
