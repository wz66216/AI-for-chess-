import asyncio
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, puzzle, whitebox
from app.core.config import settings

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

APP_VERSION = "1.0.0"

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Chess analysis and whitebox search explanation platform",
    version=APP_VERSION,
)

# Production currently uses Cloudflare Pages plus a public Railway API. Keep
# this broad until the frontend domains are finalized and pinned.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to ChessExplain API"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": APP_VERSION,
        "api_prefix": settings.API_V1_STR,
        "checks": {
            "api": "ok",
            "whitebox": "ok",
        },
    }


app.include_router(analysis.router, prefix=settings.API_V1_STR, tags=["Analysis"])
app.include_router(whitebox.router, prefix="/api/whitebox", tags=["Whitebox-Engines"])
app.include_router(puzzle.router, prefix="/api/puzzle", tags=["puzzle"])
