import logging

from communication_module.models import (
    CommunicationRequest,
    CommunicationResponse,
    EmailOutput,
    PhoneScriptOutput,
)
from utils.agent import AgentError, call_agent
from utils.markdown import parse_json_from_markdown
from settings import settings

logger = logging.getLogger(__name__)


def _build_email_message(req: CommunicationRequest) -> str:
    parts = [
        f"Generate a cold outreach EMAIL for the following lead.",
        f"\nProduct we are selling: {req.product}",
        f"Lead name: {req.lead_name}",
    ]
    if req.lead_title:
        parts.append(f"Lead title: {req.lead_title}")
    if req.lead_company:
        parts.append(f"Lead company: {req.lead_company}")
    if req.lead_context:
        parts.append(f"Context about this lead: {req.lead_context}")
    if req.why_better:
        parts.append(f"Why our product is better than competitors: {req.why_better}")

    parts.append("""
Return ONLY a JSON object with these keys:
{
  "subject": "<email subject line>",
  "body": "<full email body, plain text>"
}
No markdown, no explanation — only the JSON.""")
    return "\n".join(parts)


def _build_phone_message(req: CommunicationRequest) -> str:
    parts = [
        f"Generate a cold call PHONE SCRIPT for the following lead.",
        f"\nProduct we are selling: {req.product}",
        f"Lead name: {req.lead_name}",
    ]
    if req.lead_title:
        parts.append(f"Lead title: {req.lead_title}")
    if req.lead_company:
        parts.append(f"Lead company: {req.lead_company}")
    if req.lead_context:
        parts.append(f"Context about this lead: {req.lead_context}")
    if req.why_better:
        parts.append(f"Why our product is better than competitors: {req.why_better}")

    parts.append("""
Return ONLY a JSON object with these keys:
{
  "opening": "<how to open the call, introduce yourself>",
  "value_proposition": "<what to say about the product>",
  "objection_handling": "<how to handle common pushbacks>",
  "closing": "<how to close / get next step>",
  "full_script": "<complete script from start to finish>"
}
No markdown, no explanation — only the JSON.""")
    return "\n".join(parts)


def _get_data(raw: dict) -> dict:
    """Extract the first usable dict from a raw agent response."""
    structured = raw.get("structured_output")
    if isinstance(structured, dict):
        return structured

    for field in ("response", "content", "message", "output", "text", "answer"):
        val = raw.get(field) or ""
        if val:
            parsed = parse_json_from_markdown(val)
            if isinstance(parsed, dict):
                return parsed

    return {}


def _parse_email(raw: dict) -> EmailOutput | None:
    data = _get_data(raw)
    if data.get("subject") and data.get("body"):
        return EmailOutput(subject=data["subject"], body=data["body"])

    # plain-text Subject: / body fallback
    import re
    for field in ("response", "content", "message", "output", "text", "answer"):
        val = raw.get(field) or ""
        m = re.search(r"(?i)^subject:\s*(.+)", val, re.MULTILINE)
        if m:
            subject = m.group(1).strip()
            after = val[m.end():].lstrip("\n")
            parts = re.split(r"\n{2,}", after, maxsplit=1)
            body_text = parts[1].strip() if len(parts) > 1 else parts[0].strip()
            if body_text:
                return EmailOutput(subject=subject, body=body_text)
    return None


def _parse_phone_script(raw: dict) -> PhoneScriptOutput | None:
    data = _get_data(raw)
    if not data:
        return None
    # objection_handling may come back as a dict {"objection": "response", ...}
    oh = data.get("objection_handling", "")
    if isinstance(oh, dict):
        data["objection_handling"] = "\n\n".join(f"Q: {k}\nA: {v}" for k, v in oh.items())
    try:
        return PhoneScriptOutput(**data)
    except Exception:
        return None


async def generate(req: CommunicationRequest) -> CommunicationResponse:
    if req.type == "email":
        message = _build_email_message(req)
        logger.info("[communication] generating email for %s @ %s", req.lead_name, req.lead_company)
        raw = await call_agent(agent_id=settings.communication_agent_id, message=message, session_id=req.session_id)
        email = _parse_email(raw)
        if not email:
            logger.warning("[communication] could not parse email response")
        return CommunicationResponse(type="email", email=email)

    else:
        message = _build_phone_message(req)
        logger.info("[communication] generating phone script for %s @ %s", req.lead_name, req.lead_company)
        raw = await call_agent(agent_id=settings.communication_agent_id, message=message, session_id=req.session_id)
        script = _parse_phone_script(raw)
        if not script:
            logger.warning("[communication] could not parse phone script response")
        return CommunicationResponse(type="phone_script", phone_script=script)
