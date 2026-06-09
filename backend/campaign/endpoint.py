import logging
import uuid

from fastapi import APIRouter, HTTPException

from campaign.models import LeadsSearchRequest
from campaign.service import run
from db.repository import get_lead_result, save_lead_result, save_message
from utils.agent import AgentError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/search")
async def leads_search(req: LeadsSearchRequest):
    """Combined Apollo + LinkedIn pipeline via ICP agent."""
    try:
        leads, chat_id = await run(
            product=req.product,
            allow_no_email=req.allow_no_email,
            session_id=req.session_id,
        )
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    leads_data = [l.model_dump() for l in leads]
    leads_id = str(uuid.uuid4())
    session_id = req.session_id or chat_id

    try:
        await save_lead_result(leads_id=leads_id, session_id=session_id, product=req.product, leads=leads_data)
        await save_message(session_id, "user", req.product)
        await save_message(session_id, "assistant", f"{len(leads_data)} leads found", leads_id=leads_id, leads_count=len(leads_data))
    except Exception:
        logger.exception("[leads/search] DB save failed — continuing without persistence")

    return {
        "leads": leads_data,
        "total": len(leads_data),
        "chat_id": chat_id,
        "leads_id": leads_id,
        "session_id": session_id,
    }


@router.get("/results/{leads_id}")
async def get_leads_result(leads_id: str):
    """Fetch a stored lead result set by leads_id."""
    leads = await get_lead_result(leads_id)
    return {"leads": leads, "total": len(leads), "leads_id": leads_id}
