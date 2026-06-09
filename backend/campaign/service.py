import asyncio
import logging
import uuid

from apollo_module.service import run as run_apollo
from campaign.models import Lead
from linkedin_module.service import run as run_linkedin
from utils.icp import analyze_product

logger = logging.getLogger(__name__)


def _dedupe(leads: list[Lead]) -> list[Lead]:
    seen_emails: set[str] = set()
    seen_linkedin: set[str] = set()
    out = []
    for lead in leads:
        if lead.email and lead.email in seen_emails:
            continue
        if lead.linkedin_url and lead.linkedin_url in seen_linkedin:
            continue
        if lead.email:
            seen_emails.add(lead.email)
        if lead.linkedin_url:
            seen_linkedin.add(lead.linkedin_url)
        out.append(lead)
    return out


async def run_pipeline(
    icp: dict,
    product: str,
    allow_no_email: bool = False,
    session_id: str | None = None,
) -> list[Lead]:
    """
    Given ICP params, run Apollo + LinkedIn in parallel, then dedupe and sort.
    Does NOT call any agent — the ICP is supplied by the caller (orchestrator
    or the standalone run() below).
    """
    if not icp.get("job_titles") and not icp.get("keywords"):
        logger.warning("[campaign] ICP is empty — skipping search")
        return []

    apollo_leads, linkedin_leads = await asyncio.gather(
        run_apollo(icp, allow_no_email=allow_no_email),
        run_linkedin(icp, product=product, session_id=session_id),
    )
    logger.info("[campaign] apollo=%d | linkedin=%d", len(apollo_leads), len(linkedin_leads))

    combined = _dedupe(list(linkedin_leads) + list(apollo_leads))
    combined.sort(key=lambda l: l.score, reverse=True)
    logger.info("[campaign] ═══ done | %d leads ═══", len(combined))
    return combined


async def run(
    product: str,
    allow_no_email: bool = False,
    session_id: str | None = None,
) -> tuple[list[Lead], str]:
    """Standalone search: fetch ICP from the agent, then run the pipeline."""
    chat_id = str(uuid.uuid4())
    agent_session = session_id or chat_id
    logger.info("[campaign] ═══ start | product=%r ═══", product)

    icp = await analyze_product(product, session_id=agent_session)
    leads = await run_pipeline(icp, product=product, allow_no_email=allow_no_email, session_id=agent_session)
    return leads, chat_id
