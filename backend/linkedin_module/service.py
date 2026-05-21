import asyncio
import logging

from linkedin_module.models import Lead
from utils.apollo import enrich_by_linkedin_url, enrich_person, search_people_at_company
from utils.apify import search_linkedin_posts
from utils.icp import analyze_product
from utils.neverbounce import verify_email
from utils.outreach import write_outreach
from utils.post_filter import filter_posts

logger = logging.getLogger(__name__)

_APOLLO_SENDABLE = {"verified", "guessed"}
_SIGNAL_SCORE = {"strong": 60, "weak": 40}
_MAX_PEOPLE_PER_COMPANY = 3


async def _resolve_email(
    email: str | None, apollo_status: str | None
) -> tuple[str | None, str | None, bool]:
    if not email:
        return None, None, False
    if apollo_status in _APOLLO_SENDABLE:
        return email, apollo_status, True
    nb_status, sendable = await verify_email(email)
    return email, nb_status, sendable


def _make_lead(
    *,
    person_id: str,
    name: str,
    title: str,
    company: str,
    company_website: str | None,
    linkedin_url: str | None,
    email: str | None,
    email_status: str | None,
    score: int,
    signal_strength: str,
    post_content: str,
    query: str,
    outreach,
) -> Lead:
    first, *rest = name.split(" ", 1)
    return Lead(
        id=person_id,
        first_name=first, last_name=rest[0] if rest else "", name=name,
        title=title, company=company, company_website=company_website,
        linkedin_url=linkedin_url, email=email, email_status=email_status,
        score=score, signal_type="linkedin_post",
        signal_strength=signal_strength,
        signal_context=post_content[:500],
        signal_query=query,
        outreach=outreach,
    )


async def _build_person_lead(post: dict, kept_meta: dict, product: str, session_id: str | None = None) -> Lead | None:
    """Build a lead from a personal LinkedIn post (/in/ URL)."""
    author = post.get("author") or {}
    linkedin_url: str | None = author.get("linkedinUrl") or author.get("linkedin_url")
    name = author.get("name", "")
    author_info = author.get("info", "")
    post_content = post.get("content") or ""
    query = post.get("_query", "")
    signal_strength = kept_meta.get("signal_strength", "weak")

    logger.info("[linkedin] person lead: %s | signal=%s", name, signal_strength)

    title, company, company_website, email, email_status = "", "", None, None, None
    if linkedin_url:
        enriched = await enrich_by_linkedin_url(linkedin_url)
        title = enriched.get("title", "")
        org = enriched.get("organization") or {}
        company = org.get("name", "")
        company_website = org.get("website_url") or (
            f"https://{org['primary_domain']}" if org.get("primary_domain") else None
        )
        email, email_status, _ = await _resolve_email(
            enriched.get("email"), enriched.get("email_status")
        )

    if not title and " @ " in author_info:
        parts = author_info.split(" @ ", 1)
        title = parts[0].strip()
        company = company or parts[1].strip()

    score = _SIGNAL_SCORE.get(signal_strength, 40)
    if email_status in ("verified", "valid"):
        score += 10
    elif email_status in ("guessed", "catchall"):
        score += 5

    outreach = await write_outreach(product, name, title, company, session_id=session_id) if email else None

    return _make_lead(
        person_id=post.get("id") or post.get("entityId", ""),
        name=name, title=title, company=company, company_website=company_website,
        linkedin_url=linkedin_url, email=email, email_status=email_status,
        score=score, signal_strength=signal_strength,
        post_content=post_content, query=query, outreach=outreach,
    )


async def _build_one_company_person(
    person: dict,
    product: str,
    signal_strength: str,
    post_content: str,
    query: str,
    session_id: str | None = None,
) -> Lead | None:
    """Enrich and build a lead for one person found at a company."""
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

    enriched = await enrich_person(person_id)
    email, email_status, _ = await _resolve_email(
        enriched.get("email") or person.get("email"),
        enriched.get("email_status"),
    )
    if not email:
        return None

    score = _SIGNAL_SCORE.get(signal_strength, 40)
    if email_status in ("verified", "valid"):
        score += 10
    elif email_status in ("guessed", "catchall"):
        score += 5

    outreach = await write_outreach(product, name, title, company, session_id=session_id)

    return _make_lead(
        person_id=person_id,
        name=name, title=title, company=company,
        company_website=(enriched.get("organization") or {}).get("website_url") or company_website,
        linkedin_url=person.get("linkedin_url"),
        email=email, email_status=email_status,
        score=score, signal_strength=signal_strength,
        post_content=post_content, query=query, outreach=outreach,
    )


async def _build_company_leads(
    post: dict, kept_meta: dict, product: str, icp: dict, session_id: str | None = None
) -> list[Lead]:
    """Company page post → find ICP-matching people at that company via Apollo."""
    author = post.get("author") or {}
    company_linkedin_url: str = author.get("linkedinUrl") or author.get("linkedin_url") or ""
    company_name = author.get("name", "unknown company")
    signal_strength = kept_meta.get("signal_strength", "weak")
    post_content = post.get("content") or ""
    query = post.get("_query", "")

    logger.info("[linkedin] company post: %s | signal=%s — searching for ICP contacts", company_name, signal_strength)

    people = await search_people_at_company(
        company_linkedin_url=company_linkedin_url,
        job_titles=icp.get("job_titles", []),
        seniority_levels=icp.get("seniority_levels", []),
        per_page=_MAX_PEOPLE_PER_COMPANY,
    )

    if not people:
        logger.info("[linkedin] no ICP people found at %s", company_name)
        return []

    tasks = [
        _build_one_company_person(p, product, signal_strength, post_content, query, session_id=session_id)
        for p in people
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    leads = [r for r in results if isinstance(r, Lead)]
    logger.info("[linkedin] ✓ %d leads from company %s", len(leads), company_name)
    return leads


async def _process_post(
    post: dict, kept_meta: dict, product: str, icp: dict, session_id: str | None = None
) -> list[Lead]:
    """Route to person or company builder based on the author URL."""
    author = post.get("author") or {}
    linkedin_url: str = author.get("linkedinUrl") or author.get("linkedin_url") or ""

    if "/company/" in linkedin_url:
        return await _build_company_leads(post, kept_meta, product, icp, session_id=session_id)
    else:
        lead = await _build_person_lead(post, kept_meta, product, session_id=session_id)
        return [lead] if lead else []


async def run(product: str, results_per_query: int = 20, session_id: str | None = None) -> list[Lead]:
    logger.info("[linkedin] ═══ start | product=%r ═══", product)

    icp = await analyze_product(product, session_id=session_id)
    queries: list[str] = icp.get("linkedin_intent_queries", [])
    if not queries:
        logger.info("[linkedin] no queries from ICP")
        return []

    posts = await search_linkedin_posts(queries, results_per_query=results_per_query)
    if not posts:
        return []

    kept = await filter_posts(product, posts, session_id=session_id)
    if not kept:
        return []

    kept_index = {k["post_id"]: k for k in kept if isinstance(k, dict)}
    relevant = [p for p in posts if (p.get("id") or p.get("entityId", "")) in kept_index]

    logger.info("[linkedin] processing %d kept posts (person + company)", len(relevant))
    tasks = [
        _process_post(p, kept_index[p.get("id") or p.get("entityId", "")], product, icp, session_id=session_id)
        for p in relevant
    ]
    nested = await asyncio.gather(*tasks, return_exceptions=True)

    leads: list[Lead] = []
    for r in nested:
        if isinstance(r, list):
            leads.extend(r)
        elif isinstance(r, Exception):
            logger.error("[linkedin] process error: %s", r)

    leads.sort(key=lambda l: l.score, reverse=True)
    logger.info("[linkedin] ═══ done | %d leads ═══", len(leads))
    return leads
