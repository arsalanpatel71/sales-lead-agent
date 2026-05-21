import logging

from utils.agent import call_agent
from utils.markdown import parse_json_from_markdown
from settings import settings

logger = logging.getLogger(__name__)


def _extract_dict(raw: dict) -> dict:
    structured = raw.get("structured_output")
    if isinstance(structured, dict):
        return structured
    if isinstance(structured, list) and structured:
        first = structured[0]
        return first if isinstance(first, dict) else {}

    for field in ("response", "content", "message", "output", "text", "answer"):
        val = raw.get(field) or ""
        if not val:
            continue
        parsed = parse_json_from_markdown(val)
        if isinstance(parsed, dict):
            return parsed

    logger.error("[icp] could not extract ICP params — returning empty dict")
    return {}


async def analyze_product(product: str, session_id: str | None = None) -> dict:
    logger.info("[icp] analyzing: %r", product)
    message = (
        f"I want to sell: {product}\n\n"
        "Return ONLY a valid JSON object (no markdown, no explanation) with these keys: "
        "icp_summary, job_titles, industries, employee_ranges, seniority_levels, keywords, "
        "locations, linkedin_intent_queries."
    )
    result = await call_agent(agent_id=settings.icp_agent_id, message=message, session_id=session_id)
    icp = _extract_dict(result)
    logger.info(
        "[icp] ✓ titles=%s | seniorities=%s | ranges=%s | linkedin_queries=%s",
        icp.get("job_titles", []),
        icp.get("seniority_levels", []),
        icp.get("employee_ranges", []),
        icp.get("linkedin_intent_queries", []),
    )
    return icp
