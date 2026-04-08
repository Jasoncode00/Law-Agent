from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from ...models.schemas import ChatRequest
from ...core.agent import LawAgent

router = APIRouter()

@router.post("/chat")
async def chat(request: Request, body: ChatRequest):
    mcp = request.app.state.mcp
    agent = LawAgent(mcp=mcp)

    async def event_generator():
        async for event in agent.chat(body.persona, body.message, body.history):
            yield event

    return EventSourceResponse(event_generator())
