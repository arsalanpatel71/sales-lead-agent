"""
Apollo.io API wrapper.
Covers people search and person enrichment (by ID or LinkedIn URL).
"""
import logging

import httpx

from settings import settings

logger = logging.getLogger(__name__)

_HEADERS = {
    "X-Api-Key": settings.apollo_io_api_key,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
}

VALID_SENIORITIES = {
    "owner", "founder", "c_suite", "partner", "vp",
    "head", "director", "manager", "senior", "entry", "intern",
}

SENIORITY_ALIASES = {
    "c_level": "c_suite",
    "c-suite": "c_suite",
    "executive": "c_suite",
    "vice_president": "vp",
    "mid_level": "manager",
    "individual_contributor": "senior",
}


def _normalise_ranges(ranges: list[str]) -> list[str]:
    return [r.replace("-", ",") for r in ranges]


def _normalise_seniorities(seniorities: list[str]) -> list[str]:
    out = []
    for s in seniorities:
        s = s.lower().strip()
        s = SENIORITY_ALIASES.get(s, s)
        if s in VALID_SENIORITIES:
            out.append(s)
        else:
            logger.warning("[apollo] Unknown seniority %r — skipping", s)
    return out


async def search_people(
    job_titles: list[str],
    seniority_levels: list[str],
    employee_ranges: list[str],
    keywords: list[str],
    locations: list[str] | None = None,
    page: int = 1,
    per_page: int = 25,
) -> list[dict]:
    payload: dict = {"page": page, "per_page": per_page}
    if job_titles:
        payload["person_titles"] = job_titles
    norm = _normalise_seniorities(seniority_levels)
    if norm:
        payload["person_seniorities"] = norm
    ranges = _normalise_ranges(employee_ranges)
    if ranges:
        payload["organization_num_employees_ranges"] = ranges
    if locations:
        payload["person_locations"] = locations

    logger.info("[apollo] search → %s", payload)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.apollo_io_base_url}/mixed_people/api_search",
                json=payload,
                headers=_HEADERS,
            )
        if not resp.is_success:
            logger.error("[apollo] ✗ search HTTP %s | %s", resp.status_code, resp.text[:500])
            resp.raise_for_status()
        people = resp.json().get("people", [])
        logger.info("[apollo] ✓ search found %d people", len(people))
        return people
    except httpx.TimeoutException:
        logger.error("[apollo] ✗ search timeout")
        raise
    except httpx.HTTPStatusError:
        raise
    except Exception as exc:
        logger.exception("[apollo] ✗ search unexpected: %s", exc)
        raise


async def search_people_at_company(
    company_linkedin_url: str,
    job_titles: list[str],
    seniority_levels: list[str],
    per_page: int = 5,
) -> list[dict]:
    """Find ICP-matching people at a specific company using its LinkedIn URL."""
    # Normalise: strip trailing /posts, query params, etc.
    base_url = company_linkedin_url.split("?")[0].rstrip("/")
    if base_url.endswith("/posts"):
        base_url = base_url[: -len("/posts")]

    payload: dict = {
        "page": 1,
        "per_page": per_page,
        "organization_linkedin_urls": [base_url],
    }
    if job_titles:
        payload["person_titles"] = job_titles
    norm = _normalise_seniorities(seniority_levels)
    if norm:
        payload["person_seniorities"] = norm

    logger.info("[apollo] search_at_company → url=%s titles=%s", base_url, job_titles[:3])
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.apollo_io_base_url}/mixed_people/api_search",
                json=payload,
                headers=_HEADERS,
            )
        if not resp.is_success:
            logger.error("[apollo] ✗ search_at_company HTTP %s | %s", resp.status_code, resp.text[:300])
            return []
        people = resp.json().get("people", [])
        logger.info("[apollo] ✓ search_at_company found %d people at %s", len(people), base_url)
        return people
    except Exception as exc:
        logger.exception("[apollo] ✗ search_at_company unexpected: %s", exc)
        return []


async def enrich_person(person_id: str) -> dict:
    logger.info("[apollo] enrich → id=%s", person_id)
    return await _enrich({"id": person_id, "reveal_personal_emails": True})


async def enrich_by_linkedin_url(linkedin_url: str) -> dict:
    logger.info("[apollo] enrich → linkedin_url=%s", linkedin_url)
    return await _enrich({"linkedin_url": linkedin_url, "reveal_personal_emails": True})


async def _enrich(payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.apollo_io_base_url}/people/enrich",
                json=payload,
                headers=_HEADERS,
            )
        if not resp.is_success:
            logger.error("[apollo] ✗ enrich HTTP %s | %s", resp.status_code, resp.text[:500])
            resp.raise_for_status()
        person = resp.json().get("person") or {}
        logger.info(
            "[apollo] ✓ enrich email=%s status=%s",
            person.get("email"), person.get("email_status"),
        )
        return person
    except httpx.TimeoutException:
        logger.error("[apollo] ✗ enrich timeout | %s", payload)
        return {}
    except httpx.HTTPStatusError:
        return {}
    except Exception as exc:
        logger.exception("[apollo] ✗ enrich unexpected: %s", exc)
        return {}
