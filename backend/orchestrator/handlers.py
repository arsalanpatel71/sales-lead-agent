import logging
import uuid

from campaign.service import run_pipeline
from db.repository import save_lead_result
from orchestrator.context import IntentContext
from orchestrator.registry import intent

logger = logging.getLogger(__name__)


@intent("conversation")
async def handle_conversation(ctx: IntentContext) -> dict:
    return {"intent": "conversation", "response": ctx.response, "data": None}


@intent("lead_search")
async def handle_lead_search(ctx: IntentContext) -> dict:
    icp = ctx.data or {}
    leads = await run_pipeline(icp, product=ctx.message, session_id=ctx.session_id)
    leads_data = [l.model_dump() for l in leads]
    leads_id = str(uuid.uuid4())

    try:
        await save_lead_result(
            leads_id=leads_id,
            session_id=ctx.session_id,
            product=ctx.message,
            leads=leads_data,
        )
    except Exception:
        logger.exception("[orchestrator] lead_result save failed")

    return {
        "intent": "lead_search",
        "response": ctx.response,
        "leads": leads_data,
        "total": len(leads_data),
        "leads_id": leads_id,
    }


@intent("outreach")
async def handle_outreach(ctx: IntentContext) -> dict:
    return {"intent": "outreach", "response": ctx.response, "outreach": ctx.data}
