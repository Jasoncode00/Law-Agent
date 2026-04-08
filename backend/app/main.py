from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.routes import chat, personas, health, law
from .core.mcp_client import MCPClient
from .utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 MCP 연결, 종료 시 해제 — 단일 커넥션을 전체 요청이 공유."""
    mcp = MCPClient()
    try:
        await mcp.connect()
        app.state.mcp = mcp
        logger.info("MCP 공유 커넥션 준비 완료")
        yield
    finally:
        await mcp.disconnect()
        logger.info("MCP 공유 커넥션 종료")


app = FastAPI(
    title="SKEC Law Agent API",
    description="Backend for SKEC Law Agent with MCP integration",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(personas.router, prefix="/api/personas", tags=["Personas"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(law.router, prefix="/api", tags=["Law"])
