from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Dict, Any, Optional
import json
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI, AsyncAzureOpenAI
from ..config import settings

class LLMProvider(ABC):
    """LLM Provider Interface for Multi-LLM support"""
    
    @abstractmethod
    async def chat_with_tools(
        self, 
        messages: List[Dict[str, Any]], 
        tools: List[Dict[str, Any]], 
        system_prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat response with tool use support"""
        pass

class ClaudeProvider(LLMProvider):
    """Implementation for Anthropic Claude"""
    
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def chat_with_tools(
        self, 
        messages: List[Dict[str, Any]], 
        tools: List[Dict[str, Any]], 
        system_prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        # Convert tools to Claude format if needed (handled by caller or helper)
        async with self.client.messages.stream(
            model=settings.LLM_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=tools
        ) as stream:
            async for event in stream:
                if event.type == "text":
                    yield {"type": "content", "delta": event.text}
                elif event.type == "input_json":
                    yield {"type": "tool_input", "delta": event.partial_json}
                elif event.type == "tool_use":
                    yield {"type": "tool_input", "id": event.id, "name": event.name}
                elif event.type == "message_start":
                    pass # Initial message metadata
                elif event.type == "message_stop":
                    yield {"type": "done"}

class OpenAIProvider(LLMProvider):
    """Implementation for OpenAI GPT (supports Azure)"""
    
    def __init__(self):
        if settings.AZURE_OPENAI_ENDPOINT:
            self.client = AsyncAzureOpenAI(
                api_key=settings.OPENAI_API_KEY,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                api_version=settings.AZURE_OPENAI_API_VERSION
            )
        else:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def chat_with_tools(
        self, 
        messages: List[Dict[str, Any]], 
        tools: List[Dict[str, Any]], 
        system_prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        # Convert tools to OpenAI format if needed (handled by caller or helper)
        response = await self.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "system", "content": system_prompt}] + messages,
            tools=tools,
            stream=True
        )
        
        async for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield {"type": "content", "delta": delta.content}
            if delta and delta.tool_calls:
                for tool_call in delta.tool_calls:
                    yield {
                        "type": "tool_input",
                        "index": tool_call.index,
                        "id": tool_call.id if tool_call.id else None,
                        "name": tool_call.function.name if tool_call.function.name else None,
                        "delta": tool_call.function.arguments or ""
                    }
            if chunk.choices[0].finish_reason:
                yield {"type": "done"}

def get_llm_provider() -> LLMProvider:
    if settings.LLM_PROVIDER == "claude":
        return ClaudeProvider()
    elif settings.LLM_PROVIDER == "openai":
        return OpenAIProvider()
    else:
        raise ValueError(f"Unsupported LLM provider: {settings.LLM_PROVIDER}")
