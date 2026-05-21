from fastapi import APIRouter, HTTPException

from linkedin_module.models import LinkedInSearchRequest
from linkedin_module.service import run
from utils.agent import AgentError

router = APIRouter()


@router.post("/search")
async def linkedin_search(req: LinkedInSearchRequest):
    try:
        leads = await run(product=req.product, results_per_query=req.results_per_query)
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"leads": [l.model_dump() for l in leads], "total": len(leads)}
