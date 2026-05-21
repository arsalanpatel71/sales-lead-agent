import logging

import httpx

from settings import settings

logger = logging.getLogger(__name__)


class AgentError(Exception):
    """Raised when the agent builder returns an error or unexpected response."""
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


async def call_agent(
    agent_id: str,
    message: str,
    session_id: str | None = None,
    output_schema: dict | None = None,
) -> dict:
    url = f"{settings.agent_builder_url}/agents/chat"
    payload = {
        "agent_id": agent_id,
        "session_id": session_id,
        "message": message,
        "extra_prompt": {},
    }
    if output_schema:
        payload["output_schema"] = output_schema
    logger.info(
        "[agent] → POST %s | agent_id=%s | message=%r",
        url, agent_id, message[:120],
    )
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload)
    except httpx.TimeoutException:
        msg = f"Agent timed out after 120s (agent_id={agent_id})"
        logger.error("[agent] ✗ Timeout | agent_id=%s", agent_id)
        raise AgentError(msg) from None
    except httpx.RequestError as exc:
        msg = f"Could not reach agent builder: {exc}"
        logger.error("[agent] ✗ Connection error | agent_id=%s: %s", agent_id, exc)
        raise AgentError(msg) from exc

    if not resp.is_success:
        msg = f"Agent builder returned {resp.status_code} (agent_id={agent_id})"
        logger.error("[agent] ✗ HTTP %s | agent_id=%s | body=%s", resp.status_code, agent_id, resp.text[:500])
        raise AgentError(msg, status_code=resp.status_code)

    data = resp.json()
    logger.info(
        "[agent] ✓ HTTP %s | agent_id=%s | response=%r | has_structured=%s",
        resp.status_code, agent_id,
        (data.get("response") or "")[:120],
        data.get("structured_output") is not None,
    )
    return data
