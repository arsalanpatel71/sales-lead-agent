import asyncio
import logging
import uuid

from apollo_module.service import run as run_apollo
from leads_module.models import Lead
from linkedin_module.service import run as run_linkedin

logger = logging.getLogger(__name__)


def _dedupe(leads: list) -> list:
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


async def run(
    product: str,
    max_leads: int = 10,
    allow_no_email: bool = False,
    session_id: str | None = None,
) -> tuple[list[Lead], str]:
    chat_id = str(uuid.uuid4())
    agent_session = session_id or chat_id
    logger.info(
        "[leads] ═══ start | product=%r | max_leads=%d | chat_id=%s ═══",
        product, max_leads, chat_id,
    )

    apollo_leads, linkedin_leads = await asyncio.gather(
        run_apollo(product, max_leads=max_leads, allow_no_email=allow_no_email, session_id=agent_session),
        run_linkedin(product, session_id=agent_session),
    )

    logger.info("[leads] apollo=%d | linkedin=%d", len(apollo_leads), len(linkedin_leads))

    combined = _dedupe(list(linkedin_leads) + list(apollo_leads))
    combined.sort(key=lambda l: l.score, reverse=True)
    final = combined[:max_leads]

    logger.info("[leads] ═══ done | %d leads ═══", len(final))

    return final, chat_id
