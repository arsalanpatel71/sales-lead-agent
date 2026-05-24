import json
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
    timeout: int = 120,
) -> dict:
    url = f"{settings.agent_builder_url}/agents/message/stream"
    payload: dict = {"agent_id": agent_id, "message": message, "session_id": session_id}
    if output_schema:
        payload["output_schema"] = output_schema

    logger.info(
        "[agent] → POST %s | timeout=%ds | message=%r",
        url, timeout, message[:120],
    )

    collected_text: list[str] = []
    final_data: dict = {}

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", url, json=payload) as resp:
                if not resp.is_success:
                    body = await resp.aread()
                    msg = f"Agent builder returned {resp.status_code} (agent_id={agent_id})"
                    logger.error("[agent] ✗ HTTP %s | body=%s", resp.status_code, body[:500])
                    raise AgentError(msg, status_code=resp.status_code)

                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if not data_str or data_str == "[DONE]":
                        continue
                    try:
                        event = json.loads(data_str)
                        if isinstance(event, dict):
                            if event.get("structured_output"):
                                final_data["structured_output"] = event["structured_output"]
                            if event.get("response"):
                                final_data["response"] = event["response"]
                            # accumulate streaming text chunks
                            chunk = event.get("content") or event.get("text") or event.get("chunk") or ""
                            if chunk:
                                collected_text.append(chunk)
                    except json.JSONDecodeError:
                        collected_text.append(data_str)

    except httpx.TimeoutException:
        msg = f"Agent timed out after {timeout}s (agent_id={agent_id})"
        logger.error("[agent] ✗ Timeout | agent_id=%s", agent_id)
        raise AgentError(msg) from None
    except httpx.RequestError as exc:
        msg = f"Could not reach agent builder: {exc}"
        logger.error("[agent] ✗ Connection error | agent_id=%s: %s", agent_id, exc)
        raise AgentError(msg) from exc

    if not final_data.get("response") and collected_text:
        final_data["response"] = "".join(collected_text)

    logger.info(
        "[agent] ✓ agent_id=%s | response=%r | has_structured=%s",
        agent_id,
        (final_data.get("response") or "")[:120],
        final_data.get("structured_output") is not None,
    )
    return final_data
