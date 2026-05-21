from typing import Any, Literal

from pydantic import BaseModel, model_validator


class CommunicationRequest(BaseModel):
    product: str
    lead_name: str = ""
    lead_title: str = ""
    lead_company: str = ""
    lead_context: str = ""
    lead_data: dict[str, Any] | None = None  # full lead object from the frontend
    type: Literal["email", "phone_script"] = "email"
    why_better: str | None = None
    session_id: str | None = None

    @model_validator(mode="after")
    def fill_from_lead_data(self) -> "CommunicationRequest":
        """Auto-fill fields from lead_data if not provided directly."""
        d = self.lead_data or {}
        if not self.lead_name:
            self.lead_name = d.get("name") or d.get("lead_name", "")
        if not self.lead_title:
            self.lead_title = d.get("title") or d.get("lead_title", "")
        if not self.lead_company:
            self.lead_company = d.get("company") or d.get("lead_company", "")
        if not self.lead_context:
            self.lead_context = d.get("signal_context") or d.get("lead_context", "")
        return self


class EmailOutput(BaseModel):
    subject: str
    body: str


class PhoneScriptOutput(BaseModel):
    opening: str
    value_proposition: str
    objection_handling: str
    closing: str
    full_script: str


class CommunicationResponse(BaseModel):
    type: str
    email: EmailOutput | None = None
    phone_script: PhoneScriptOutput | None = None
