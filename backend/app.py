import logging
import sys
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from apollo_module.endpoint import router as apollo_router
from communication_module.endpoint import router as communication_router
from leads_module.endpoint import router as leads_router
from linkedin_module.endpoint import router as linkedin_router
from test_module.endpoint import router as test_router
from utils.agent import call_agent
from settings import settings
from pydantic import BaseModel

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sales Agent", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── module routers
app.include_router(leads_router,         prefix="/leads",         tags=["leads"])
app.include_router(apollo_router,        prefix="/apollo",        tags=["apollo"])
app.include_router(linkedin_router,      prefix="/linkedin",      tags=["linkedin"])
app.include_router(communication_router, prefix="/communication", tags=["communication"])
app.include_router(test_router,          prefix="/test",          tags=["test"])


# ── chat
class ChatRequest(BaseModel):
    message: str
    chat_id: str | None = None


@app.post("/chat", tags=["chat"])
async def chat(req: ChatRequest):
    chat_id = req.chat_id or str(uuid.uuid4())
    result = await call_agent(
        agent_id=settings.sales_agent_id,
        message=req.message,
        session_id=chat_id,
    )
    return {**result, "chat_id": chat_id}


# ── middleware + handlers
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("→ %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("← %s %s %d", request.method, request.url.path, response.status_code)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)
