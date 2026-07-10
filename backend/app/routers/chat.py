from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai_tools import generate_chat_reply
from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reply = generate_chat_reply(db, current_user.id, data.message, data.report_id)
    return ChatResponse(reply=reply)
