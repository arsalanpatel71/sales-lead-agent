import logging

from utils.agent import call_agent
from settings import settings

logger = logging.getLogger(__name__)


def _extract_icp(raw: dict) -> dict:
    structured = raw.get("structured_output")
    if isinstance(structured, dict):
        return structured
    if isinstance(structured, list) and structured and isinstance(structured[0], dict):
        return structured[0]
    logger.error("[icp] no structured_output in agent response — returning empty dict")
    return {}


async def analyze_product(product: str, session_id: str | None = None) -> dict:
    logger.info("[icp] analyzing: %r", product)
    result = await call_agent(
        agent_id=settings.icp_agent_id,
        message=f"I want to sell: {product}",
        session_id=session_id,
        timeout=400,
    )
    icp = _extract_icp(result)
    logger.info(
        "[icp] ✓ titles=%s | seniorities=%s | ranges=%s | linkedin_queries=%s | min_leads=%s",
        icp.get("job_titles", []),
        icp.get("seniority_levels", []),
        icp.get("employee_ranges", []),
        icp.get("linkedin_intent_queries", []),
        icp.get("min_leads"),
    )
    return icp
