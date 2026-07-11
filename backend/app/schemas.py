import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.functional_validators import BeforeValidator

StrippedStr = Annotated[str, BeforeValidator(lambda v: v.strip())]


class UserCreate(BaseModel):
    username: StrippedStr = Field(
        min_length=3, max_length=50, description="username of the user"
    )
    email: EmailStr
    password: StrippedStr = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: StrippedStr = Field(min_length=8)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: StrippedStr
    created_at: datetime


class Token(BaseModel):
    access_token: StrippedStr
    token_type: StrippedStr = Field(default="bearer")


class TokenData(BaseModel):
    id: uuid.UUID


class Medication(BaseModel):
    name: str
    dosage: str
    time: str


class EmergencyContact(BaseModel):
    name: str
    phone: str


class HealthProfileBase(BaseModel):
    age: int | None = None
    sex: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: list[str] | None = None
    medications: list[Medication] | None = None
    emergency_contact: EmergencyContact | None = None


class HealthProfileUpdate(HealthProfileBase):
    pass


class HealthProfileResponse(HealthProfileBase):
    is_complete: bool = False


class MedicalEntryBase(BaseModel):
    term: str
    value: str
    unit: str | None = None
    status: str | None = None
    source: str  # "self_reported" | "report_upload" | "vital"
    report_id: uuid.UUID | None = None
    recorded_at: datetime


class MedicalEntryCreate(MedicalEntryBase):
    pass


class MedicalEntryResponse(MedicalEntryBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportResponse(BaseModel):
    id: uuid.UUID
    status: str
    summary: str | None = None
    risk_level: str | None = None
    created_at: datetime
    flagged_values: list[MedicalEntryResponse] = []

    model_config = {"from_attributes": True}


class ReportSummaryResponse(BaseModel):
    id: uuid.UUID
    status: str
    risk_level: str | None = None
    created_at: datetime
    display_name: str


class ReportUploadResponse(BaseModel):
    report_id: uuid.UUID
    status: str


class Insight(BaseModel):
    type: str  # "status" | "trend" | "reminder" | "activity"
    icon: str
    text: str


class DashboardResponse(BaseModel):
    health_score: int
    insights: list[Insight]


class ChatRequest(BaseModel):
    message: str
    report_id: uuid.UUID | None = None


class ChatResponse(BaseModel):
    reply: str
