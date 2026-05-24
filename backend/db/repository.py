import logging
from datetime import datetime, timezone

from db.client import get_db

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


async def save_chat_turn(session_id: str, user_query: str, leads_id: str, lead_count: int = 0) -> None:
    db = get_db()
    turn = {
        "user": user_query,
        "assistant": f"leads_ref:{leads_id}",
        "leads_id": leads_id,
        "lead_count": lead_count,
        "created_at": datetime.now(timezone.utc),
    }
    await db.chat_sessions.update_one(
        {"_id": session_id},
        {
            "$push": {"messages": turn},
            "$set": {"updated_at": datetime.now(timezone.utc)},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )
    logger.info("[db] saved chat turn → chat_sessions[%s]", session_id)


async def get_all_sessions() -> list[dict]:
    """Return all sessions sorted by most recent, metadata only (no lead payload)."""
    db = get_db()
    result = []
    cursor = db.chat_sessions.find({}, {"messages": 1, "created_at": 1, "updated_at": 1}).sort("updated_at", -1)
    async for doc in cursor:
        messages = doc.get("messages", [])
        product = messages[0]["user"] if messages else ""
        lead_count = sum(m.get("lead_count", 0) for m in messages)
        result.append({
            "session_id": str(doc["_id"]),
            "product": product,
            "lead_count": lead_count,
            "turn_count": len(messages),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        })
    return result


async def get_chat_history(session_id: str) -> list[dict]:
    """Return chat turns with leads_id resolved to full lead data."""
    db = get_db()

    session = await db.chat_sessions.find_one({"_id": session_id})
    if not session:
        return []

    messages = session.get("messages", [])

    # Collect all unique leads_ids to fetch in one query
    leads_ids = list({m["leads_id"] for m in messages if m.get("leads_id")})
    leads_by_id: dict[str, list] = {}
    if leads_ids:
        cursor = db.lead_results.find({"_id": {"$in": leads_ids}})
        async for doc in cursor:
            leads_by_id[doc["_id"]] = doc.get("leads", [])

    result = []
    for m in messages:
        leads_id = m.get("leads_id")
        result.append({
            "user": m["user"],
            "leads_id": leads_id,
            "leads": leads_by_id.get(leads_id, []),
            "created_at": m.get("created_at"),
        })

    return result
