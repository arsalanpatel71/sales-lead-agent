import logging
from datetime import datetime, timezone

from db.client import get_db
from utils.pagination import page_params, paginated_response

logger = logging.getLogger(__name__)


async def save_lead_result(leads_id: str, session_id: str, product: str, leads: list[dict]) -> None:
    db = get_db()
    doc = {
        "_id": leads_id,
        "session_id": session_id,
        "product": product,
        "leads": leads,
        "created_at": datetime.now(timezone.utc),
    }
    await db.lead_results.replace_one({"_id": leads_id}, doc, upsert=True)
    logger.info("[db] saved %d leads → lead_results[%s]", len(leads), leads_id)


async def save_message(
    session_id: str,
    role: str,
    content: str,
    leads_id: str | None = None,
    leads_count: int = 0,
) -> None:
    db = get_db()
    msg: dict = {
        "role": role,
        "content": content,
        "created_at": datetime.now(timezone.utc),
    }
    if leads_id:
        msg["leads_id"] = leads_id
        msg["leads_count"] = leads_count

    await db.chat_sessions.update_one(
        {"_id": session_id},
        {
            "$push": {"messages": msg},
            "$set": {"updated_at": datetime.now(timezone.utc)},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )
    logger.info("[db] saved %s message → chat_sessions[%s]", role, session_id)


async def get_lead_result(leads_id: str) -> list[dict]:
    db = get_db()
    doc = await db.lead_results.find_one({"_id": leads_id})
    if not doc:
        return []
    return doc.get("leads", [])


async def get_all_sessions(page: int = 1, page_size: int = 10) -> dict:
    db = get_db()
    skip, limit = page_params(page, page_size)
    total = await db.chat_sessions.count_documents({})
    cursor = (
        db.chat_sessions
        .find({}, {"messages": 1, "created_at": 1, "updated_at": 1})
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = []
    async for doc in cursor:
        messages = doc.get("messages", [])
        title = next((m["content"] for m in messages if m.get("role") == "user"), "Untitled")
        lead_count = sum(m.get("leads_count", 0) for m in messages if m.get("leads_id"))
        items.append({
            "session_id": str(doc["_id"]),
            "title": title[:100],
            "lead_count": lead_count,
            "turn_count": len(messages),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        })
    return paginated_response(items, total, page, page_size)


async def get_chat_history(session_id: str) -> list[dict]:
    db = get_db()
    session = await db.chat_sessions.find_one({"_id": session_id})
    if not session:
        return []

    result = []
    for m in session.get("messages", []):
        entry: dict = {
            "role": m.get("role", "user"),
            "content": m.get("content", ""),
            "created_at": m.get("created_at"),
        }
        if m.get("leads_id"):
            entry["leads_id"] = m["leads_id"]
            entry["leads_count"] = m.get("leads_count", 0)
        result.append(entry)
    return result
