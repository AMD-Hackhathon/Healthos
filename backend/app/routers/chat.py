from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


def fake_ai_reply(message: str, report_id) -> str:
    """
    STUB — placeholder until real LangChain chat is wired in.
    """
    if report_id:
        return f"(stub reply) You asked about your report: '{message}'. Real AI reasoning coming soon."
    return f"(stub reply) You said: '{message}'. Real AI reasoning coming soon."


@router.post("", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reply = fake_ai_reply(data.message, data.report_id)
    return ChatResponse(reply=reply)
