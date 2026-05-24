from fastapi import APIRouter, HTTPException

from linkedin_module.models import LinkedInSearchRequest
from linkedin_module.service import run
from utils.agent import AgentError
from utils.icp import analyze_product

router = APIRouter()


@router.post("/search")
async def linkedin_search(req: LinkedInSearchRequest):
    try:
        print(f"Analyzing product: {req.product}")
        icp = await analyze_product(req.product)
        print(f"ICP analysis result: {icp}")
        leads = await run(icp, product=req.product)
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"leads": [l.model_dump() for l in leads], "total": len(leads)}
