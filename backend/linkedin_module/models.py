from pydantic import BaseModel, Field
from utils.outreach import OutreachEmail


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
    signal_type: str = "linkedin_post"
    signal_strength: str | None = None
    signal_context: str | None = None
    signal_query: str | None = None
    outreach: OutreachEmail | None = None


class LinkedInSearchRequest(BaseModel):
    product: str
    results_per_query: int = Field(default=20, ge=1, le=50)
