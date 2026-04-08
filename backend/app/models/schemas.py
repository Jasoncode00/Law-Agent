from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatRequest(BaseModel):
    persona: str
    message: str
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    # This might be used for non-streaming if needed, 
    # but the primary mode is SSE.
    response: str
    sources: List[Dict[str, Any]]

class PersonaResponse(BaseModel):
    id: str
    name: str
    description: str
