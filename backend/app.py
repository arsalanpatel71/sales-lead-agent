import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from apollo_module.endpoint import router as apollo_router
from outreach_email_phone.endpoint import router as outreach_router
from campaign.endpoint import router as campaign_router
from linkedin_module.endpoint import router as linkedin_router
from test_module.endpoint import router as test_router
from db.client import connect_db, close_db
from db.repository import get_chat_history, get_all_sessions

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    logger.info("[db] connected")
    yield
    await close_db()
    logger.info("[db] disconnected")


app = FastAPI(title="Sales Agent", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── module routers
app.include_router(campaign_router,  prefix="/campaign",              tags=["campaign"])
app.include_router(apollo_router,    prefix="/apollo",                tags=["apollo"])
app.include_router(linkedin_router,  prefix="/linkedin",              tags=["linkedin"])
app.include_router(outreach_router,  prefix="/outreach_email_phone",  tags=["outreach"])
app.include_router(test_router,      prefix="/test",                  tags=["test"])


# ── history
@app.get("/history", tags=["history"])
async def list_sessions():
    sessions = await get_all_sessions()
    return {"sessions": sessions}


@app.get("/history/{session_id}", tags=["history"])
async def chat_history(session_id: str):
    turns = await get_chat_history(session_id)
    return {"session_id": session_id, "turns": turns}


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
