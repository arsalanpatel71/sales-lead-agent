from pydantic import BaseModel, Field


class Lead(BaseModel):
    id: str
    first_name: str
    last_name: str
    name: str
    title: str
    company: str
    linkedin_url: str | None = None
    company_website: str | None = None
    email: str | None = None
    email_status: str | None = None
    score: int = 0
    signal_type: str = "icp_match"
    signal_strength: str | None = None
    signal_context: str | None = None
    signal_query: str | None = None


class LeadsSearchRequest(BaseModel):
    product: str
    allow_no_email: bool = Field(default=False)
    session_id: str | None = None
