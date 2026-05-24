import asyncio
import logging

from campaign.models import Lead
from utils.apollo import enrich_person, search_people
from utils.neverbounce import verify_email

logger = logging.getLogger(__name__)

_APOLLO_SENDABLE = {"verified", "guessed"}
_MAX_PAGES = 5


async def _resolve_email(
    email: str | None, apollo_status: str | None
) -> tuple[str | None, str | None, bool]:
    if not email:
        return None, None, False
    if apollo_status in _APOLLO_SENDABLE:
        return email, apollo_status, True
    nb_status, sendable = await verify_email(email)
    return email, nb_status, sendable


def _title_score(title: str, targets: list[str]) -> int:
    tl = title.lower()
    for t in targets:
        if t.lower() in tl or tl in t.lower():
            return 20
    words = set(tl.split())
    for t in targets:
        if words & set(t.lower().split()):
            return 10
    return 0


def _industry_score(industry: str | None, targets: list[str]) -> int:
    if not industry:
        return 0
    ci = industry.lower()
    return 10 if any(t.lower() in ci or ci in t.lower() for t in targets) else 0


async def _build_lead(person: dict, icp: dict, allow_no_email: bool) -> Lead | None:
    person_id = person.get("id", "")
    first = person.get("first_name", "")
    last = person.get("last_name", "")
    name = f"{first} {last}".strip()
    title = person.get("title", "")
    org = person.get("organization") or {}
    company = org.get("name", "")
    company_website = org.get("website_url") or (
        f"https://{org['primary_domain']}" if org.get("primary_domain") else None
    )

    logger.info("[apollo] building lead: %s | %s @ %s", name, title, company)

    enriched = await enrich_person(person_id)
    email, email_status, is_sendable = await _resolve_email(
        enriched.get("email") or person.get("email"),
        enriched.get("email_status"),
    )
    company_website = (enriched.get("organization") or {}).get("website_url") or company_website

    if email and not is_sendable:
        if not allow_no_email:
            return None
    elif not email and not allow_no_email:
        return None

    score = 30
    score += _title_score(title, icp.get("job_titles", []))
    score += _industry_score(org.get("industry"), icp.get("industries", []))
    if email_status in ("verified", "valid"):
        score += 10
    elif email_status in ("guessed", "catchall"):
        score += 5

    return Lead(
        id=person_id,
        first_name=first, last_name=last, name=name,
        title=title, company=company, company_website=company_website,
        linkedin_url=person.get("linkedin_url"),
        email=email, email_status=email_status,
        score=score, signal_type="icp_match",
    )


async def run(icp: dict, allow_no_email: bool = False) -> list[Lead]:
    min_leads: int | None = icp.get("min_leads") or None
    logger.info("[apollo] ═══ start | min_leads=%s ═══", min_leads or "unlimited")

    leads: list[Lead] = []
    page = 1
    per_page = min(min_leads * 2, 50) if min_leads else 50

    while page <= _MAX_PAGES and (min_leads is None or len(leads) < min_leads):
        logger.info("[apollo] search page %d", page)
        try:
            people = await search_people(
                job_titles=icp.get("job_titles", []),
                seniority_levels=icp.get("seniority_levels", []),
                employee_ranges=icp.get("employee_ranges", []),
                keywords=icp.get("keywords", []),
                locations=icp.get("locations"),
                page=page,
                per_page=per_page,
            )
        except Exception as exc:
            logger.exception("[apollo] search failed: %s", exc)
            break

        if not people:
            break

        results = await asyncio.gather(
            *[_build_lead(p, icp, allow_no_email) for p in people],
            return_exceptions=True,
        )
        leads += [r for r in results if isinstance(r, Lead)]

        if allow_no_email:
            break
        page += 1

    final = sorted(leads, key=lambda l: l.score, reverse=True)
    logger.info("[apollo] ═══ done | %d leads ═══", len(final))
    return final
