from pydantic import BaseModel

from campaign.models import Lead  # noqa: F401 — re-exported for backward compat


class LinkedInSearchRequest(BaseModel):
    product: str
