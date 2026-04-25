import sys
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import analysis, whitebox
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="国际象棋引擎招法解释与棋局分析平台",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应配置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to ChessExplain API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# 注册路由
app.include_router(analysis.router, prefix=settings.API_V1_STR, tags=["Analysis"])
app.include_router(whitebox.router, prefix="/api/whitebox", tags=["Whitebox-Engines"])
