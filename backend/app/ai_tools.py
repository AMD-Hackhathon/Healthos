from __future__ import annotations

import json
import mimetypes
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from langchain.tools import tool
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import ChatMessage, HealthProfile, MedicalEntry, Report


NORMAL_RISK = "normal"
ADVICE_RISK = "advice"
URGENT_RISK = "urgent"

KNOWN_TERMS = {
    "ldl": ("ldl_cholesterol", "mg/dL"),
    "ldl cholesterol": ("ldl_cholesterol", "mg/dL"),
    "hdl": ("hdl_cholesterol", "mg/dL"),
    "hdl cholesterol": ("hdl_cholesterol", "mg/dL"),
    "total cholesterol": ("total_cholesterol", "mg/dL"),
    "triglycerides": ("triglycerides", "mg/dL"),
    "glucose": ("glucose", "mg/dL"),
    "fasting glucose": ("glucose", "mg/dL"),
    "a1c": ("hba1c", "%"),
    "hba1c": ("hba1c", "%"),
    "hemoglobin a1c": ("hba1c", "%"),
    "heart rate": ("heart_rate", "bpm"),
    "pulse": ("heart_rate", "bpm"),
    "systolic blood pressure": ("systolic_blood_pressure", "mmHg"),
    "diastolic blood pressure": ("diastolic_blood_pressure", "mmHg"),
    "blood pressure": ("blood_pressure", "mmHg"),
    "hemoglobin": ("hemoglobin", "g/dL"),
    "tsh": ("tsh", "mIU/L"),
}


def extract_report_text(file_path: str) -> str:
    """Extract report text from common upload formats without changing routing."""
    path = Path(file_path)
    mime_type, _ = mimetypes.guess_type(path.name)

    if path.suffix.lower() == ".pdf" or mime_type == "application/pdf":
        return _extract_pdf_text(path)

    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def analyze_report(file_path: str) -> dict[str, Any]:
    text = extract_report_text(file_path)
    ai_result = _analyze_report_with_fireworks(text) if text.strip() else None
    if ai_result:
        return _coerce_report_result(ai_result)

    values = _extract_medical_values(text)
    risk_level = _risk_from_values(values)
    summary = _report_summary(text, values, risk_level)
    return {
        "summary": summary,
        "risk_level": risk_level,
        "flagged_values": values,
    }


def generate_health_summary(db: Session, user_id: uuid.UUID) -> None:
    from app.models import HealthSummary

    profile = db.query(HealthProfile).filter_by(user_id=user_id).first()
    entries = (
        db.query(MedicalEntry)
        .filter_by(user_id=user_id)
        .order_by(MedicalEntry.recorded_at.desc())
        .limit(50)
        .all()
    )

    health_score = _health_score(profile, entries)
    insights = _summary_insights(profile, entries)

    summary = db.query(HealthSummary).filter_by(user_id=user_id).first()
    payload = json.dumps(insights)
    if not summary:
        summary = HealthSummary(
            user_id=user_id, health_score=health_score, insights=payload
        )
        db.add(summary)
    else:
        summary.health_score = health_score
        summary.insights = payload

    db.commit()


def generate_chat_reply(
    db: Session, user_id: uuid.UUID, message: str, report_id: uuid.UUID | None
) -> str:
    history = (
        db.query(ChatMessage)
        .filter_by(user_id=user_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
        .all()
    )
    profile = db.query(HealthProfile).filter_by(user_id=user_id).first()
    entries = (
        db.query(MedicalEntry)
        .filter_by(user_id=user_id)
        .order_by(MedicalEntry.recorded_at.desc())
        .limit(30)
        .all()
    )
    report = None
    if report_id:
        report = db.query(Report).filter_by(id=report_id, user_id=user_id).first()

    db.add(ChatMessage(user_id=user_id, role="user", content=message))
    reply = _chat_with_fireworks(message, history, profile, entries, report)
    if not reply:
        reply = _deterministic_chat_reply(message, profile, entries, report)
    db.add(ChatMessage(user_id=user_id, role="assistant", content=reply))
    db.commit()
    return reply


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
        entries = query.order_by(MedicalEntry.recorded_at.desc()).all()
        return [_entry_dict(e) for e in entries]


def _extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""

    try:
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""


def _analyze_report_with_fireworks(text: str) -> dict[str, Any] | None:
    if not settings.fireworks_api_key:
        return None

    prompt = (
        "Extract health report values from this text. Return JSON only with keys "
        "summary, risk_level, flagged_values. risk_level must be normal, advice, "
        "or urgent. flagged_values items need term, value, unit, status. Use "
        "snake_case terms and keep values as strings.\n\n"
        f"Report text:\n{text[:12000]}"
    )
    content = _fireworks_chat(prompt, max_tokens=900)
    if not content:
        return None
    return _json_from_text(content)


def _chat_with_fireworks(
    message: str,
    history: list[ChatMessage],
    profile: HealthProfile | None,
    entries: list[MedicalEntry],
    report: Report | None,
) -> str | None:
    if not settings.fireworks_api_key:
        return None

    context = {
        "profile": _profile_dict(profile),
        "recent_entries": [_entry_dict(e) for e in entries[:20]],
        "report": _report_dict(report),
        "history": [{"role": h.role, "content": h.content} for h in history[-10:]],
    }
    prompt = (
        "You are HealthOS assistant. Use only the supplied user health context. "
        "If there is not enough personal data, ask concise guiding questions. "
        "Do not diagnose. Give practical, cautious health information and advise "
        "professional care for urgent or unclear concerns.\n\n"
        f"Context JSON:\n{json.dumps(context, default=str)}\n\n"
        f"User message: {message}"
    )
    return _fireworks_chat(prompt, max_tokens=500)


def _fireworks_chat(prompt: str, max_tokens: int) -> str | None:
    payload = {
        "model": settings.fireworks_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        "https://api.fireworks.ai/inference/v1/chat/completions",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.fireworks_api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=20) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (OSError, error.URLError, json.JSONDecodeError):
        return None

    choices = body.get("choices") or []
    if not choices:
        return None
    return choices[0].get("message", {}).get("content")


def _json_from_text(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.I | re.S)
    match = re.search(r"\{.*\}", text, flags=re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _extract_medical_values(text: str) -> list[dict[str, str | None]]:
    values: list[dict[str, str | None]] = []
    if not text.strip():
        return values

    lowered = re.sub(r"\s+", " ", text.lower())
    for label, (term, default_unit) in KNOWN_TERMS.items():
        escaped = re.escape(label)
        pattern = rf"\b{escaped}\b[^0-9]{{0,40}}(\d+(?:\.\d+)?(?:/\d+(?:\.\d+)?)?)\s*([a-z%/]+)?"
        for match in re.finditer(pattern, lowered):
            raw_value = match.group(1)
            unit = match.group(2) or default_unit
            status = _status_for_value(term, raw_value)
            item = {
                "term": term,
                "value": raw_value,
                "unit": unit,
                "status": status,
            }
            if item not in values:
                values.append(item)

    return values


def _status_for_value(term: str, value: str) -> str | None:
    if "/" in value and term == "blood_pressure":
        systolic, diastolic = [float(part) for part in value.split("/", 1)]
        if systolic >= 180 or diastolic >= 120:
            return "urgent"
        if systolic >= 130 or diastolic >= 80:
            return "high"
        return "normal"

    try:
        number = float(value)
    except ValueError:
        return None

    thresholds = {
        "ldl_cholesterol": (100, 190),
        "total_cholesterol": (200, 240),
        "triglycerides": (150, 500),
        "glucose": (100, 250),
        "hba1c": (5.7, 9.0),
        "systolic_blood_pressure": (130, 180),
        "diastolic_blood_pressure": (80, 120),
        "heart_rate": (100, 140),
        "tsh": (4.5, 10),
    }
    low_thresholds = {
        "hdl_cholesterol": 40,
        "hemoglobin": 12,
        "heart_rate": 50,
    }

    if term in low_thresholds and number < low_thresholds[term]:
        return "low"
    if term in thresholds:
        high, urgent = thresholds[term]
        if number >= urgent:
            return "urgent"
        if number >= high:
            return "high"
    return "normal"


def _risk_from_values(values: list[dict[str, str | None]]) -> str:
    statuses = {item.get("status") for item in values}
    if "urgent" in statuses:
        return URGENT_RISK
    if {"high", "low"} & statuses:
        return ADVICE_RISK
    return NORMAL_RISK


def _report_summary(
    text: str, values: list[dict[str, str | None]], risk_level: str
) -> str:
    if not text.strip():
        return (
            "No readable text could be extracted from this report. Upload a text-based "
            "PDF or configure OCR support for scanned/image reports."
        )
    if not values:
        return "The report text was processed, but no common structured lab or vital values were found."
    abnormal = [v for v in values if v.get("status") in {"high", "low", "urgent"}]
    if abnormal:
        names = ", ".join(v["term"] for v in abnormal[:5] if v.get("term"))
        return f"Processed the report and found values needing review: {names}. Overall risk level: {risk_level}."
    return "Processed the report and found no obvious abnormal values among the recognized measurements."


def _coerce_report_result(result: dict[str, Any]) -> dict[str, Any]:
    risk_level = str(result.get("risk_level") or ADVICE_RISK).lower()
    if risk_level not in {NORMAL_RISK, ADVICE_RISK, URGENT_RISK}:
        risk_level = ADVICE_RISK
    values = []
    for item in result.get("flagged_values") or []:
        if not isinstance(item, dict) or not item.get("term") or not item.get("value"):
            continue
        values.append(
            {
                "term": _normalize_term(str(item["term"])),
                "value": str(item["value"]),
                "unit": item.get("unit"),
                "status": item.get("status"),
            }
        )
    return {
        "summary": str(result.get("summary") or "Report processed."),
        "risk_level": risk_level,
        "flagged_values": values,
    }


def _health_score(
    profile: HealthProfile | None, entries: list[MedicalEntry]
) -> int:
    score = 90
    if not profile:
        score -= 10
    else:
        missing = [
            profile.age,
            profile.sex,
            profile.height_cm,
            profile.weight_kg,
        ].count(None)
        score -= missing * 3

    for entry in entries[:20]:
        if entry.status == "urgent":
            score -= 20
        elif entry.status in {"high", "low"}:
            score -= 8
    return max(0, min(100, score))


def _summary_insights(
    profile: HealthProfile | None, entries: list[MedicalEntry]
) -> list[dict[str, str]]:
    insights: list[dict[str, str]] = []
    abnormal = [e for e in entries if e.status in {"high", "low", "urgent"}]

    if abnormal:
        latest = abnormal[0]
        insights.append(
            {
                "type": "status",
                "icon": "alert",
                "text": f"{latest.term} is marked {latest.status}; review the latest report details.",
            }
        )
    else:
        insights.append(
            {
                "type": "status",
                "icon": "green",
                "text": "No critical issues detected in the latest saved health data.",
            }
        )

    if not profile:
        insights.append(
            {
                "type": "reminder",
                "icon": "profile",
                "text": "Complete your health profile so future insights can use age, sex, height, and weight.",
            }
        )
    elif profile.conditions:
        conditions = _safe_json_loads(profile.conditions, [])
        if conditions:
            insights.append(
                {
                    "type": "reminder",
                    "icon": "pill",
                    "text": "Keep medications and follow-up plans aligned with your saved conditions.",
                }
            )

    if entries:
        insights.append(
            {
                "type": "trend",
                "icon": "activity",
                "text": f"{len(entries)} recent health entries are available for trend review.",
            }
        )
    return insights[:5]


def _deterministic_chat_reply(
    message: str,
    profile: HealthProfile | None,
    entries: list[MedicalEntry],
    report: Report | None,
) -> str:
    if not entries and not profile:
        return (
            "I do not have enough personal health data yet. Tell me your main concern, "
            "recent symptoms, medications, and any report values you want to understand."
        )

    if report:
        report_values = [e for e in entries if e.report_id == report.id]
        if report_values:
            values = ", ".join(
                f"{e.term} {e.value}{' ' + e.unit if e.unit else ''} ({e.status or 'unmarked'})"
                for e in report_values[:5]
            )
            return (
                f"For this report, I found: {values}. "
                f"Report risk is {report.risk_level or 'not set'}. {report.summary or ''}"
            ).strip()
        return report.summary or "I found the report, but it has no structured values saved yet."

    abnormal = [e for e in entries if e.status in {"high", "low", "urgent"}]
    if abnormal:
        latest = abnormal[0]
        return (
            f"Your latest notable value is {latest.term}: {latest.value}"
            f"{' ' + latest.unit if latest.unit else ''}, marked {latest.status}. "
            "Use this as a discussion point with a clinician, especially if symptoms are present."
        )

    return (
        "Your saved values do not show an obvious critical flag. Ask about a specific "
        "metric or time window if you want a more focused review."
    )


def _entry_dict(entry: MedicalEntry) -> dict[str, Any]:
    return {
        "term": entry.term,
        "value": entry.value,
        "unit": entry.unit,
        "status": entry.status,
        "source": entry.source,
        "report_id": str(entry.report_id) if entry.report_id else None,
        "recorded_at": entry.recorded_at.isoformat()
        if isinstance(entry.recorded_at, datetime)
        else str(entry.recorded_at),
    }


def _profile_dict(profile: HealthProfile | None) -> dict[str, Any] | None:
    if not profile:
        return None
    return {
        "age": profile.age,
        "sex": profile.sex,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "conditions": _safe_json_loads(profile.conditions, []),
        "medications": _safe_json_loads(profile.medications, []),
    }


def _report_dict(report: Report | None) -> dict[str, Any] | None:
    if not report:
        return None
    return {
        "id": str(report.id),
        "status": report.status,
        "summary": report.summary,
        "risk_level": report.risk_level,
        "created_at": report.created_at.isoformat()
        if isinstance(report.created_at, datetime)
        else str(report.created_at),
    }


def _safe_json_loads(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def _normalize_term(term: str) -> str:
    term = term.strip().lower()
    term = re.sub(r"[^a-z0-9]+", "_", term)
    return re.sub(r"_+", "_", term).strip("_")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
