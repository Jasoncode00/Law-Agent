from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .config import settings
from .api.routes import chat, personas, health, law
from .core.mcp_client import MCPClient
from .utils.logger import logger

# IP 기준 Rate Limiter
limiter = Limiter(key_func=get_remote_address)


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
    docs_url=None,    # Swagger UI 비활성화 — 프로덕션 API 구조 노출 방지
    redoc_url=None,   # ReDoc 비활성화
)

# Rate limiting 설정 — IP당 분당 10회, 초당 2회
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
# Docker 배포 시 backend는 내부 네트워크에만 존재 (포트 외부 미노출)
# Next.js rewrites가 /api/* 요청을 프록시하므로 origin은 frontend만 허용
_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# 보안 HTTP 헤더 미들웨어
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "   # Next.js 인라인 스크립트 허용
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Include routes
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(personas.router, prefix="/api/personas", tags=["Personas"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(law.router, prefix="/api", tags=["Law"])
