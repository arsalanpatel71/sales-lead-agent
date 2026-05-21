import asyncio
import logging
import re

from utils.agent import call_agent
from utils.markdown import parse_json_from_markdown, parse_markdown_sections
from settings import settings

logger = logging.getLogger(__name__)

_BATCH_SIZE = 20
_MAX_BATCHES = 5
_CONTENT_CAP = 300

_OUTPUT_SCHEMA = {
    "name": "FilteredPosts",
    "json_schema": {
        "type": "object",
        "properties": {
            "kept": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "post_id":        {"type": "string"},
                        "signal_strength": {"type": "string", "enum": ["strong", "weak"]},
                        "reason":         {"type": "string"},
                    },
                    "required": ["post_id", "signal_strength", "reason"],
                },
            }
        },
        "required": ["kept"],
    },
}


def _has_linkedin_url(post: dict) -> bool:
    """Return True only if the author has any LinkedIn URL (person or company)."""
    author = post.get("author") or {}
    url = author.get("linkedinUrl") or author.get("linkedin_url") or ""
    return bool(url)


_FORMAT_INSTRUCTION = """
REPLY WITH ONLY this JSON — no explanation, no markdown, no other text:
{"kept": [{"post_id": "<id>", "signal_strength": "strong" or "weak", "reason": "<one line>"}]}
Empty result: {"kept": []}
When unsure, keep as weak. Only skip if clearly unrelated to the product.
""".strip()


def _build_message(product: str, posts: list[dict]) -> str:
    lines = [
        f"Product: {product}\n",
        "Find LinkedIn posts where the author or their company could be a potential buyer for this product.\n",
    ]
    for post in posts:
        post_id = post.get("id") or post.get("entityId", "")
        content = (post.get("content") or "")[:_CONTENT_CAP]
        author = post.get("author") or {}
        lines.append(
            f"---\n"
            f"[Query: \"{post.get('_query', '')}\"]\n"
            f"Post ID: {post_id}\n"
            f"Author: {author.get('name', 'Unknown')} | {author.get('info', '')}\n"
            f"Content: {content}\n"
        )
    lines.append(f"\n{_FORMAT_INSTRUCTION}")
    return "\n".join(lines)


def _normalise_item(item: dict) -> dict | None:
    post_id = item.get("post_id") or item.get("id", "")
    if not post_id:
        return None
    signal = item.get("signal_strength") or item.get("signal", "weak")
    return {
        "post_id": str(post_id),
        "signal_strength": signal,
        "reason": item.get("reason", f"{signal} signal"),
    }


def _extract_from_markdown_sections(text: str) -> list[dict]:
    """
    Parse agent text responses. Handles three formats the agent may return:

    Format A — markdown headings:
        ### Strong Signals
        Post ID: 123

    Format B — bold bracket markers in --- separated blocks:
        ---
        **[Strong]**
        Post ID: 123

    Format C — inline signal label anywhere before Post ID:
        signal: strong | Post ID: 123
    """
    result = []

    # Format A: ### headings (plain lines OR markdown table inside each section)
    sections = parse_markdown_sections(text)
    for heading, lines in sections.items():
        if "strong" in heading:
            strength = "strong"
        elif "weak" in heading:
            strength = "weak"
        else:
            continue
        body = "\n".join(lines)
        # plain "Post ID: 123" or "**Post ID:** 123"
        for pid in re.findall(r"\*{0,2}Post\s+ID\*{0,2}[*:\s]+(\d+)", body, re.IGNORECASE):
            result.append({"post_id": pid, "signal_strength": strength, "reason": f"{strength} signal"})
        # markdown table row: | 7463147281483980800 | Author | … |
        for pid in re.findall(r"^\|\s*(\d{10,})\s*\|", body, re.MULTILINE):
            result.append({"post_id": pid, "signal_strength": strength, "reason": f"{strength} signal"})
    if result:
        return result

    # Format B: --- separated blocks, signal expressed as:
    #   **[Strong]** / **[Weak]**          (bracket style)
    #   **Classification:** strong/weak    (key-value style)
    # Post ID may appear as plain "Post ID: 123" or bold "**Post ID:** 123"
    _SIGNAL_RE = re.compile(
        r"\*{1,2}\[(strong|weak)\]\*{1,2}"          # **[Strong]**
        r"|\*{0,2}Classification\*{0,2}[*:\s]+(strong|weak)",  # **Classification:** weak
        re.IGNORECASE,
    )
    _PID_RE = re.compile(r"\*{0,2}Post\s+ID\*{0,2}[*:\s]+(\d+)", re.IGNORECASE)

    blocks = re.split(r"\n---+\n?", text)
    for block in blocks:
        signal_match = _SIGNAL_RE.search(block)
        if not signal_match:
            continue
        strength = (signal_match.group(1) or signal_match.group(2)).lower()
        pid_match = _PID_RE.search(block)
        if pid_match:
            result.append({"post_id": pid_match.group(1), "signal_strength": strength, "reason": f"{strength} signal"})
    if result:
        return result

    return result


def _extract_kept(raw: dict) -> list[dict]:
    # 1. structured_output field (agent builder may populate this)
    structured = raw.get("structured_output")
    if isinstance(structured, dict):
        items = structured.get("kept") or structured.get("posts") or []
        result = [r for r in (_normalise_item(i) for i in items if isinstance(i, dict)) if r]
        if result:
            return result
    if isinstance(structured, list):
        result = [r for r in (_normalise_item(i) for i in structured if isinstance(i, dict)) if r]
        if result:
            return result

    # 2. parse each text field using the markdown utility
    for field in ("response", "content", "message", "output", "text", "answer"):
        val = raw.get(field) or ""
        if not val:
            continue

        parsed = parse_json_from_markdown(val)

        if isinstance(parsed, list):
            result = [r for r in (_normalise_item(i) for i in parsed if isinstance(i, dict)) if r]
            if result:
                return result

        if isinstance(parsed, dict):
            items = parsed.get("kept") or parsed.get("posts") or []
            result = [r for r in (_normalise_item(i) for i in items if isinstance(i, dict)) if r]
            if result:
                return result

        # 3. markdown section headings fallback
        result = _extract_from_markdown_sections(val)
        if result:
            return result

    return []


async def _filter_batch(product: str, batch: list[dict], session_id: str | None = None) -> list[dict]:
    message = _build_message(product, batch)
    logger.info("[post_filter] ── PAYLOAD TO AGENT ──\n%s", message)
    try:
        result = await call_agent(
            agent_id=settings.post_filter_linkedin_agent_id,
            message=message,
            output_schema=_OUTPUT_SCHEMA,
            session_id=session_id,
        )
        logger.info("[post_filter] ── RAW AGENT RESPONSE ──\n%s", result)
        kept = _extract_kept(result)
        logger.info("[post_filter] ── EXTRACTED KEPT ── %s", kept)
        return kept
    except Exception as exc:
        logger.error("[post_filter] batch failed: %s", exc)
        return []


async def filter_posts(product: str, posts: list[dict], session_id: str | None = None) -> list[dict]:
    if not posts:
        return []

    # Only send posts that have a LinkedIn URL (person or company page)
    actionable = [p for p in posts if _has_linkedin_url(p)]
    logger.info("[post_filter] %d posts → %d with LinkedIn URL", len(posts), len(actionable))

    if not actionable:
        return []

    # Run filter in batches, up to _MAX_BATCHES × _BATCH_SIZE posts total
    batches = [
        actionable[i: i + _BATCH_SIZE]
        for i in range(0, min(len(actionable), _BATCH_SIZE * _MAX_BATCHES), _BATCH_SIZE)
    ]
    logger.info("[post_filter] running %d batches of up to %d posts", len(batches), _BATCH_SIZE)

    batch_results = await asyncio.gather(*[_filter_batch(product, b, session_id=session_id) for b in batches])

    all_kept = []
    for kept in batch_results:
        all_kept.extend(kept)

    logger.info("[post_filter] ✓ kept %d / %d posts evaluated", len(all_kept), len(actionable))
    return all_kept
