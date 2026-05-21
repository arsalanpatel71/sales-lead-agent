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
    signal_type: str = "icp_match"
    outreach: OutreachEmail | None = None


class ApolloSearchRequest(BaseModel):
    product: str
    max_leads: int = Field(default=10, ge=1, le=50)
    allow_no_email: bool = Field(default=False)
