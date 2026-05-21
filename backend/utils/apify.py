"""
Apify API wrapper — LinkedIn post search via harvestapi~linkedin-post-search.
"""
import logging

import httpx

from settings import settings

logger = logging.getLogger(__name__)

_APIFY_BASE = "https://api.apify.com/v2"


async def search_linkedin_posts(queries: list[str], results_per_query: int | None = None) -> list[dict]:
    """
    Run each query against the Apify LinkedIn post search actor.
    Returns a merged, deduped list of posts, each tagged with `_query`.
    """
    if not settings.apify_api_key:
        logger.warning("[apify] APIFY_API_KEY not set — skipping LinkedIn search")
        return []

    limit = results_per_query if results_per_query is not None else settings.apify_results_per_query
    url = (
        f"{_APIFY_BASE}/acts/{settings.apify_linkedin_actor_id}"
        f"/run-sync-get-dataset-items?token={settings.apify_api_key}&limit={limit}"
    )

    seen_ids: set[str] = set()
    all_posts: list[dict] = []

    for query in queries:
        logger.info("[apify] searching: %r (per_query=%d)", query, limit)
        payload = {
            "searchQueries": [query],
            "datePosted": "past-month",
            "sortBy": "date",
        }
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                resp = await client.post(url, json=payload)

            if not resp.is_success:
                logger.error(
                    "[apify] ✗ HTTP %s for query %r | %s",
                    resp.status_code, query, resp.text[:300],
                )
                continue

            posts = resp.json() if isinstance(resp.json(), list) else []
            new = 0
            for post in posts:
                post_id = post.get("id") or post.get("entityId", "")
                if post_id and post_id not in seen_ids:
                    seen_ids.add(post_id)
                    post["_query"] = query
                    all_posts.append(post)
                    new += 1

            logger.info(
                "[apify] ✓ query=%r → %d new posts (total: %d)",
                query, new, len(all_posts),
            )
            for i, post in enumerate(posts[:new], 1):
                author = post.get("author") or {}
                logger.info(
                    "[apify] post[%d] id=%s | author=%r | url=%s | content=%r",
                    i,
                    post.get("id") or post.get("entityId", ""),
                    author.get("name", ""),
                    author.get("linkedinUrl") or author.get("linkedin_url", ""),
                    (post.get("content") or "")[:200],
                )

        except httpx.TimeoutException:
            logger.error("[apify] ✗ timeout for query %r", query)
        except Exception as exc:
            logger.exception("[apify] ✗ unexpected for query %r: %s", query, exc)

    logger.info("[apify] done — %d unique posts across %d queries", len(all_posts), len(queries))
    return all_posts
