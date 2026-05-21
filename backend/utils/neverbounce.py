"""
NeverBounce API wrapper — single email verification.
"""
import logging

import httpx

from settings import settings

logger = logging.getLogger(__name__)

_SENDABLE = {"valid", "catchall"}


async def verify_email(email: str) -> tuple[str, bool]:
    """Returns (status, is_sendable). Status: valid | invalid | disposable | catchall | unknown."""
    logger.info("[neverbounce] → verifying %s", email)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{settings.never_bounce_base_url}/single/check",
                params={"api_key": settings.never_bounce_api_key, "email": email},
            )
        if not resp.is_success:
            logger.error("[neverbounce] ✗ HTTP %s | %s", resp.status_code, resp.text[:300])
            resp.raise_for_status()
        status = resp.json().get("result", "unknown")
        sendable = status in _SENDABLE
        logger.info("[neverbounce] ✓ %s → %s sendable=%s", email, status, sendable)
        return status, sendable
    except httpx.TimeoutException:
        logger.error("[neverbounce] ✗ timeout for %s", email)
        return "unknown", False
    except httpx.HTTPStatusError:
        return "unknown", False
    except Exception as exc:
        logger.exception("[neverbounce] ✗ unexpected for %s: %s", email, exc)
        return "unknown", False
