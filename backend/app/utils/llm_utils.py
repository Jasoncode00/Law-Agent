from typing import Dict, Any, List

def mcp_to_claude_tool(mcp_tool: Any) -> Dict[str, Any]:
    """Convert MCP tool definition to Claude format"""
    return {
        "name": mcp_tool.name,
        "description": mcp_tool.description,
        "input_schema": mcp_tool.inputSchema
    }

def mcp_to_openai_tool(mcp_tool: Any) -> Dict[str, Any]:
    """Convert MCP tool definition to OpenAI format"""
    return {
        "type": "function",
        "function": {
            "name": mcp_tool.name,
            "description": mcp_tool.description,
            "parameters": mcp_tool.inputSchema
        }
    }

def convert_mcp_tools(mcp_tools: List[Any], provider_type: str) -> List[Dict[str, Any]]:
    """Batch convert MCP tools to the target LLM format"""
    if provider_type == "claude":
        return [mcp_to_claude_tool(t) for t in mcp_tools]
    elif provider_type == "openai":
        return [mcp_to_openai_tool(t) for t in mcp_tools]
    return []
