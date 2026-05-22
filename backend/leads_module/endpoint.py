from fastapi import APIRouter, HTTPException

from leads_module.models import LeadsSearchRequest
from leads_module.service import run
from utils.agent import AgentError

router = APIRouter()


@router.post("/search")
async def leads_search(req: LeadsSearchRequest):
    """Combined Apollo + LinkedIn pipeline in parallel."""
    try:
        leads, chat_id = await run(
            product=req.product,
            max_leads=req.max_leads,
            allow_no_email=req.allow_no_email,
            session_id=req.session_id,
        )
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {
        "leads": [l.model_dump() for l in leads],
        "total": len(leads),
        "chat_id": chat_id,
    }
