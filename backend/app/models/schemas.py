from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any


class HistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    persona: str
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[HistoryMessage] = Field(default=[], max_length=50)

    @field_validator('message')
    @classmethod
    def message_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('message must not be blank')
        return v


class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]


class PersonaResponse(BaseModel):
    id: str
    name: str
    description: str
