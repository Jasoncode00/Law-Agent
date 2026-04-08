import json
from typing import List, Dict, Any, AsyncGenerator
from .llm_provider import get_llm_provider
from .mcp_client import MCPClient
from .personas import get_persona
from .streaming import create_event
from ..utils.llm_utils import convert_mcp_tools
from ..config import settings
from ..utils.logger import logger

class LawAgent:
    """Orchestrator for Law Agent chat with MCP tools"""

    def __init__(self, mcp: MCPClient):
        self.llm = get_llm_provider()
        self.mcp = mcp

    async def chat(self, persona_id: str, message: str, history: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Main chat loop with streaming"""
        persona = get_persona(persona_id)
        system_prompt = persona["system_prompt"]
        
        # 1. Get tools from MCP
        try:
            mcp_tools = await self.mcp.get_tools()
            llm_tools = convert_mcp_tools(mcp_tools, settings.LLM_PROVIDER)
        except Exception as e:
            logger.error(f"Failed to get MCP tools: {e}")
            yield create_event("error", {"message": "법령 검색 도구를 불러오는 데 실패했습니다."})
            return

        messages = history + [{"role": "user", "content": message}]
        
        # Max loops to prevent infinite tool calling
        max_loops = 10
        for loop in range(max_loops):
            tool_calls_requested = False
            current_tool_calls = []
            
            # OpenAI and Claude have different tool call structures in their SDKs
            # Our llm_provider abstracts some of this, but we need to handle the results
            
            async for chunk in self.llm.chat_with_tools(messages, llm_tools, system_prompt):
                if chunk["type"] == "content":
                    yield create_event("content", {"delta": chunk["delta"]})
                
                elif chunk["type"] == "tool_input":
                    tool_calls_requested = True
                    yield create_event("tool_call", chunk)
                    
                    idx = chunk.get("index", 0)
                    while len(current_tool_calls) <= idx:
                        current_tool_calls.append({
                            "id": chunk.get("id", f"call_{idx}"), # Capturing ID
                            "name": "", 
                            "arguments_str": ""
                        })
                    
                    if chunk.get("name") is not None:
                        current_tool_calls[idx]["name"] = chunk["name"]
                    if chunk.get("delta") is not None:
                        current_tool_calls[idx]["arguments_str"] += chunk["delta"]
                    if chunk.get("id") is not None:
                        current_tool_calls[idx]["id"] = chunk["id"]

                elif chunk["type"] == "done":
                    if not tool_calls_requested:
                        yield create_event("done", {})
                        return

            if tool_calls_requested:
                # 1. Prepare assistant message with tool calls
                # Claude: content[] 에 tool_use 블록 추가
                # OpenAI: content는 None, tool_calls 키 사용
                assistant_msg: dict = {
                    "role": "assistant",
                    "content": [] if settings.LLM_PROVIDER == "claude" else None,
                }
                
                # 2. Execute tools and collect results
                tool_results_messages = []
                
                for tc in current_tool_calls:
                    try:
                        args = json.loads(tc["arguments_str"])
                        result = await self.mcp.call_tool(tc["name"], args)
                        
                        yield create_event("tool_result", {
                            "name": tc["name"],
                            "result": str(result.content)
                        })
                        
                        # Claude and OpenAI formats differ significantly here
                        if settings.LLM_PROVIDER == "claude":
                            # Add to assistant message content
                            assistant_msg["content"].append({
                                "type": "tool_use",
                                "id": tc["id"],
                                "name": tc["name"],
                                "input": args
                            })
                            # Add as separate tool_result message
                            tool_results_messages.append({
                                "role": "user",
                                "content": [{
                                    "type": "tool_result",
                                    "tool_use_id": tc["id"],
                                    "content": str(result.content)
                                }]
                            })
                        else: # openai
                            # Assistant message needs tool_calls
                            if "tool_calls" not in assistant_msg:
                                assistant_msg["tool_calls"] = []
                            assistant_msg["tool_calls"].append({
                                "id": tc["id"],
                                "type": "function",
                                "function": {
                                    "name": tc["name"],
                                    "arguments": tc["arguments_str"]
                                }
                            })
                            # Add as tool message
                            tool_results_messages.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "name": tc["name"],
                                "content": str(result.content)
                            })
                            
                    except Exception as e:
                        logger.error(f"Tool execution failed: {tc['name']} - {e}")
                        yield create_event("error", {"message": f"도구 실행 중 오류: {tc['name']}"})

                # 3. Update conversation history
                messages.append(assistant_msg)
                messages.extend(tool_results_messages)
                
                # 4. Continue the loop (next iteration will send the tool results back)
                continue

        # max_loops 소진 시 done 이벤트 보장
        logger.warning("max_loops reached without final answer")
        yield create_event("done", {})

    async def close(self):
        pass  # 공유 커넥션 — lifespan에서 관리하므로 여기서 해제하지 않음
