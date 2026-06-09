import logging

import orchestrator.handlers  # noqa: F401 — import registers the @intent handlers
from db.repository import save_message
from orchestrator.context import IntentContext
from orchestrator.registry import dispatch
from settings import settings
from utils.agent import call_agent

logger = logging.getLogger(__name__)


async def handle_message(message: str, session_id: str) -> dict:
    logger.info("[orchestrator] → message=%r | session=%s", message[:120], session_id)

    raw = await call_agent(
        agent_id=settings.manager_agent_id,
        message=message,
        session_id=session_id,
        timeout=400,
    )
    structured = raw.get("structured_output") or {}

    ctx = IntentContext(
        message=message,
        session_id=session_id,
        response=structured.get("response") or raw.get("response") or "",
        data=structured.get("data"),
        agent_called=structured.get("agent_called") or "none",
    )
    intent_name = structured.get("intent") or "conversation"
    logger.info("[orchestrator] intent=%s | agent_called=%s", intent_name, ctx.agent_called)

    result = await dispatch(intent_name, ctx)
    result["session_id"] = session_id

    # Persist both turns (user + assistant) regardless of intent
    try:
        await save_message(session_id, "user", message)
        await save_message(
            session_id,
            "assistant",
            result.get("response", ""),
            leads_id=result.get("leads_id"),
            leads_count=result.get("total", 0),
        )
    except Exception:
        logger.exception("[orchestrator] DB save failed — continuing without persistence")

    return result
