import logging
import uuid

from fastapi import APIRouter, HTTPException

from orchestrator.models import ChatRequest
from orchestrator.service import handle_message
from utils.agent import AgentError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def chat(req: ChatRequest):
    """Unified entry point — the manager agent decides what happens."""
    session_id = req.session_id or str(uuid.uuid4())
    try:
        return await handle_message(req.message, session_id)
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
