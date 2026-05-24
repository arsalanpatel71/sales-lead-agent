import logging
import re

from pydantic import BaseModel

from utils.agent import call_agent
from utils.markdown import parse_json_from_markdown
from settings import settings


class OutreachEmail(BaseModel):
    subject: str
    body: str
    personalization_hook: str


logger = logging.getLogger(__name__)


def _parse_plaintext_email(content: str) -> OutreachEmail | None:
    """Parse plain-text `Subject: ...\n\n<body>` format from the outreach agent."""
    subject_match = re.search(r"(?i)^subject:\s*(.+)", content, re.MULTILINE)
    if not subject_match:
        return None
    subject = subject_match.group(1).strip()

    after_subject = content[subject_match.end():].lstrip("\n")
    parts = re.split(r"\n{2,}", after_subject, maxsplit=1)
    body = parts[1].strip() if len(parts) > 1 else parts[0].strip()
    if not body:
        return None

    first_sentence = re.split(r"(?<=[.!?])\s", body, maxsplit=1)[0]
    hook = first_sentence if len(first_sentence) < 200 else ""
    return OutreachEmail(subject=subject, body=body, personalization_hook=hook)


def _extract_outreach(raw: dict, name: str = "") -> OutreachEmail | None:
    # 1. structured_output
    structured = raw.get("structured_output")
    if isinstance(structured, dict):
        try:
            return OutreachEmail(**structured)
        except Exception:
            pass
    if isinstance(structured, list) and structured:
        try:
            return OutreachEmail(**structured[0])
        except Exception:
            pass

    # 2. parse JSON from any text field via markdown utility
    for field in ("response", "content", "message", "output", "text", "answer"):
        val = raw.get(field) or ""
        if not val:
            continue

        parsed = parse_json_from_markdown(val)
        if isinstance(parsed, dict):
            try:
                return OutreachEmail(**parsed)
            except Exception:
                pass

        # 3. plain-text Subject / body format
        result = _parse_plaintext_email(val)
        if result:
            logger.info("[outreach] ✓ parsed plain-text email for %s", name)
            return result

    logger.warning("[outreach] ✗ could not extract outreach for %s", name)
    return None


async def write_outreach(
    product: str, name: str, title: str, company: str, session_id: str | None = None
) -> OutreachEmail | None:
    logger.info("[outreach] writing email for %s (%s @ %s)", name, title, company)
    message = (
        f"Product: {product}\n"
        f"Lead name: {name}\n"
        f"Lead title: {title}\n"
        f"Lead company: {company}"
    )
    try:
        result = await call_agent(agent_id=settings.outreach_agent_id, message=message, session_id=session_id, timeout=400)
        outreach = _extract_outreach(result, name=name)
        if outreach:
            logger.info("[outreach] ✓ written for %s | subject=%r", name, outreach.subject)
        return outreach
    except Exception as exc:
        logger.exception("[outreach] failed for %s: %s", name, exc)
        return None
