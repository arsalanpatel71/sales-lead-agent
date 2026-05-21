from fastapi import APIRouter, HTTPException

from communication_module.models import CommunicationRequest, CommunicationResponse
from communication_module.service import generate
from utils.agent import AgentError

router = APIRouter()


@router.post("/generate", response_model=CommunicationResponse)
async def generate_communication(req: CommunicationRequest):
    try:
        return await generate(req)
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
