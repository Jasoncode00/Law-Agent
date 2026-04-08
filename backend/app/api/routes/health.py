from fastapi import APIRouter
from ...config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "provider": settings.LLM_PROVIDER}
