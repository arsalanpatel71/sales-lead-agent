from fastapi import APIRouter, Query

from utils.apollo import enrich_by_linkedin_url, enrich_person, search_people
from utils.apify import search_linkedin_posts
from utils.neverbounce import verify_email

router = APIRouter()


@router.get("/apollo/search")
async def test_apollo_search(
    title: str = Query(default="Head of AI"),
    location: str = Query(default="United States"),
    per_page: int = Query(default=5, ge=1, le=25),
):
    people = await search_people(
        job_titles=[title], seniority_levels=[], employee_ranges=[],
        keywords=[], locations=[location], page=1, per_page=per_page,
    )
    return {
        "count": len(people),
        "people": [
            {
                "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(),
                "title": p.get("title"),
                "company": (p.get("organization") or {}).get("name"),
                "email": p.get("email"),
                "email_status": p.get("email_status"),
                "apollo_id": p.get("id"),
            }
            for p in people
        ],
    }


@router.get("/apollo/enrich")
async def test_apollo_enrich(apollo_id: str = Query(description="Apollo person ID")):
    person = await enrich_person(apollo_id)
    return {
        "email": person.get("email"),
        "email_status": person.get("email_status"),
        "title": person.get("title"),
        "company": (person.get("organization") or {}).get("name"),
    }


@router.get("/apollo/enrich-linkedin")
async def test_apollo_enrich_linkedin(linkedin_url: str = Query(description="LinkedIn profile URL")):
    person = await enrich_by_linkedin_url(linkedin_url)
    return {
        "email": person.get("email"),
        "email_status": person.get("email_status"),
        "title": person.get("title"),
        "company": (person.get("organization") or {}).get("name"),
    }


@router.get("/linkedin/search")
async def test_linkedin_search(
    query: str = Query(default="hiring AI engineers"),
    results: int = Query(default=5, ge=1, le=20),
):
    posts = await search_linkedin_posts([query], results_per_query=results)
    return {
        "count": len(posts),
        "posts": [
            {
                "id": p.get("id") or p.get("entityId"),
                "author": (p.get("author") or {}).get("name"),
                "author_info": (p.get("author") or {}).get("info"),
                "linkedin_url": (p.get("author") or {}).get("linkedinUrl"),
                "content_preview": (p.get("content") or "")[:300],
            }
            for p in posts
        ],
    }


@router.get("/neverbounce/verify")
async def test_neverbounce_verify(email: str = Query(description="Email to verify")):
    status, sendable = await verify_email(email)
    return {"email": email, "status": status, "sendable": sendable}
