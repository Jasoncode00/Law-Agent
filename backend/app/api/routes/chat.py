from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from ...models.schemas import ChatRequest
from ...core.agent import LawAgent

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/chat")
@limiter.limit("10/minute;2/second")
async def chat(request: Request, body: ChatRequest):
    mcp = request.app.state.mcp
    agent = LawAgent(mcp=mcp)

    async def event_generator():
        async for event in agent.chat(body.persona, body.message, body.history):
            yield event

    return EventSourceResponse(event_generator())
