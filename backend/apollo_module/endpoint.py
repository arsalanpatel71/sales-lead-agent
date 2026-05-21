from fastapi import APIRouter, HTTPException

from apollo_module.models import ApolloSearchRequest
from apollo_module.service import run
from utils.agent import AgentError

router = APIRouter()


@router.post("/search")
async def apollo_search(req: ApolloSearchRequest):
    try:
        leads = await run(
            product=req.product,
            max_leads=req.max_leads,
            allow_no_email=req.allow_no_email,
        )
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"leads": [l.model_dump() for l in leads], "total": len(leads)}
