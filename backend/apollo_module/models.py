from pydantic import BaseModel, Field

from campaign.models import Lead  # noqa: F401 — re-exported for backward compat


class ApolloSearchRequest(BaseModel):
    product: str
    max_leads: int = Field(default=10, ge=1, le=50)
    allow_no_email: bool = Field(default=False)
