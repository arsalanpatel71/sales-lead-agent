import logging

from fastapi import APIRouter, HTTPException

from outreach_email_phone.models import CommunicationRequest, CommunicationResponse
from outreach_email_phone.service import generate
from utils.agent import AgentError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=CommunicationResponse)
async def generate_communication(req: CommunicationRequest):
    logger.info("[communication/generate] hit | type=%s | lead=%r", req.type, req.lead_name)
    try:
        result = await generate(req)
        logger.info("[communication/generate] done | type=%s", req.type)
        return result
    except AgentError as exc:
        logger.error("[communication/generate] AgentError: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
