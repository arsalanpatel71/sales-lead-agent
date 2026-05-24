import logging

from fastapi import APIRouter, HTTPException

from outreach_email_phone.models import CommunicationRequest, CommunicationResponse
from outreach_email_phone.service import generate
from utils.agent import AgentError
from settings import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=CommunicationResponse)
async def generate_communication(req: CommunicationRequest):
    logger.info(
        "[communication/generate] hit | type=%s | lead=%r | agent_id=%r",
        req.type, req.lead_name, settings.communication_agent_id or "EMPTY — check SALES__COMMUNICATION_WRITER_AGENT_ID in .env",
    )
    if not settings.communication_agent_id:
        logger.error("[communication/generate] communication_agent_id is empty — cannot call agent")
        raise HTTPException(status_code=500, detail="communication_agent_id not configured. Set SALES__COMMUNICATION_WRITER_AGENT_ID in .env")
    try:
        result = await generate(req)
        logger.info("[communication/generate] done | type=%s", req.type)
        return result
    except AgentError as exc:
        logger.error("[communication/generate] AgentError: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
