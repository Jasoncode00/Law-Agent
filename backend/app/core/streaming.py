import json
from typing import AsyncGenerator, Any

def create_event(event_type: str, data: Any) -> str:
    """Format an SSE event"""
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
