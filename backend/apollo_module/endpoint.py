from fastapi import APIRouter, HTTPException

from apollo_module.models import ApolloSearchRequest
from apollo_module.service import run
from utils.agent import AgentError
from utils.icp import analyze_product

router = APIRouter()


@router.post("/search")
async def apollo_search(req: ApolloSearchRequest):
    try:
        icp = await analyze_product(req.product)
        leads = await run(icp, allow_no_email=req.allow_no_email)
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"leads": [l.model_dump() for l in leads], "total": len(leads)}
