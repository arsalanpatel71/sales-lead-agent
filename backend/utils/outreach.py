import logging

from pydantic import BaseModel

from utils.agent import call_agent
from settings import settings


class OutreachEmail(BaseModel):
    subject: str
    body: str
    personalization_hook: str


logger = logging.getLogger(__name__)


def _extract_outreach(raw: dict, name: str = "") -> OutreachEmail | None:
    structured = raw.get("structured_output") or {}
    data = structured.get("data")
    if isinstance(data, dict):
        try:
            return OutreachEmail(**data)
        except Exception:
            pass
    logger.warning("[outreach] ✗ could not extract outreach for %s", name)
    return None


async def write_outreach(
    product: str, name: str, title: str, company: str, session_id: str | None = None
) -> OutreachEmail | None:
    logger.info("[outreach] writing email for %s (%s @ %s)", name, title, company)
    message = (
        f"Write an outreach email.\n"
        f"Product: {product}\n"
        f"Lead name: {name}\n"
        f"Lead title: {title}\n"
        f"Lead company: {company}"
    )
    try:
        result = await call_agent(
            agent_id=settings.manager_agent_id,
            message=message,
            session_id=session_id,
            timeout=400,
        )
        outreach = _extract_outreach(result, name=name)
        if outreach:
            logger.info("[outreach] ✓ written for %s | subject=%r", name, outreach.subject)
        return outreach
    except Exception as exc:
        logger.exception("[outreach] failed for %s: %s", name, exc)
        return None
